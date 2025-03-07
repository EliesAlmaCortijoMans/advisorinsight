import json
from channels.generic.websocket import AsyncWebsocketConsumer
import finnhub
import os
from dotenv import load_dotenv
import asyncio
import time
import redis
from datetime import datetime, timedelta
import pytz
import logging
from openai import OpenAI
import base64
import tempfile
from django.conf import settings
import numpy as np
from vosk import Model, KaldiRecognizer
import wave
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

load_dotenv()

class StockConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize Finnhub client
        api_key = os.getenv('FINNHUB_API_KEY')
        if not api_key:
            raise ValueError("FINNHUB_API_KEY not found in environment variables")
        self.finnhub_client = finnhub.Client(api_key=api_key)
        
        # Initialize Redis client with timeout
        try:
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                db=0,
                socket_timeout=2,
                decode_responses=True
            )
            self.redis_available = True
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_available = False
        
        self.subscribed_symbols = set()
        self.update_task = None
        self.last_update_time = 0
        self.update_interval = 15  # 15 seconds between updates

    def get_market_status(self):
        """Get current market status and next opening time"""
        try:
            # Get current time in local timezone and convert to US/Eastern
            local_tz = datetime.now().astimezone().tzinfo
            local_time = datetime.now(local_tz)
            eastern = pytz.timezone('US/Eastern')
            now = local_time.astimezone(eastern)
            
            # Market hours are 9:30 AM to 4:00 PM Eastern, Monday to Friday
            market_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
            market_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
            
            # Debug timezone info
            logger.info("=== Market Hours Debug ===")
            logger.info(f"Local timezone: {local_tz}")
            logger.info(f"Local time (raw): {datetime.now()}")
            logger.info(f"Local time (with tz): {local_time}")
            logger.info(f"Eastern time: {now}")
            logger.info(f"Market open: {market_open}")
            logger.info(f"Market close: {market_close}")
            logger.info(f"Current weekday: {now.weekday()}")  # 0 = Monday, 6 = Sunday
            logger.info(f"Current hour (ET): {now.hour}")
            logger.info(f"Current minute (ET): {now.minute}")
            logger.info("========================")
            
            is_open = (
                now.weekday() < 5 and  # Monday to Friday
                market_open <= now <= market_close
            )
            
            # Calculate next market open time
            next_open = None
            if not is_open:
                if now.weekday() >= 5:  # Weekend
                    days_until_monday = (7 - now.weekday()) % 7
                    next_open = now.replace(hour=9, minute=30, second=0, microsecond=0) + timedelta(days=days_until_monday)
                elif now < market_open:  # Before market hours today
                    next_open = market_open
                elif now > market_close:  # After market hours today
                    next_open = (now + timedelta(days=1)).replace(hour=9, minute=30, second=0, microsecond=0)
                    # If next day is weekend, move to Monday
                    if next_open.weekday() >= 5:
                        days_until_monday = (7 - next_open.weekday()) % 7
                        next_open = next_open + timedelta(days=days_until_monday)
                
                next_open_ts = int(next_open.timestamp()) if next_open else None
            else:
                next_open_ts = None
            
            logger.info(f"Market status result: is_open={is_open}, next_open={next_open_ts}")
            return {
                'is_open': is_open,
                'next_open': next_open_ts
            }
        except Exception as e:
            logger.error(f"Error getting market status: {e}")
            return {'is_open': False, 'next_open': None}

    def get_quote(self, symbol):
        """Get quote data from Finnhub or cache"""
        try:
            # Always get fresh quote during market hours
            market_status = self.get_market_status()
            if market_status['is_open']:
                logger.info(f"Market open - Getting fresh quote for {symbol}")
                quote = self.finnhub_client.quote(symbol)
                if not quote or 'c' not in quote:
                    logger.error(f"Invalid quote data received for {symbol}: {quote}")
                    return None
                
                quote_data = {
                    'type': 'price_update',
                    'symbol': symbol,
                    'price': quote['c'],
                    'change': quote['d'],
                    'percentChange': quote['dp'],
                    'high': quote['h'],
                    'low': quote['l'],
                    'open': quote['o'],
                    'previousClose': quote['pc'],
                    'timestamp': int(time.time()),
                    'isLive': True,
                    'nextMarketOpen': None
                }
                logger.info(f"Fresh quote data: {quote_data}")
                return quote_data
            
            # Market is closed - try cache first
            if self.redis_available:
                cached_data = self.redis_client.get(f"stock_price:{symbol}")
                if cached_data:
                    logger.info(f"Using cached data for {symbol}")
                    cached_quote = json.loads(cached_data)
                    # Update the market status info
                    cached_quote['isLive'] = False
                    cached_quote['nextMarketOpen'] = market_status['next_open']
                    return cached_quote
            
            # No cache available - get fresh quote and cache it
            logger.info(f"No cache - Getting quote for {symbol}")
            quote = self.finnhub_client.quote(symbol)
            if not quote or 'c' not in quote:
                logger.error(f"Invalid quote data received for {symbol}: {quote}")
                return None
            
            quote_data = {
                'type': 'price_update',
                'symbol': symbol,
                'price': quote['c'],
                'change': quote['d'],
                'percentChange': quote['dp'],
                'high': quote['h'],
                'low': quote['l'],
                'open': quote['o'],
                'previousClose': quote['pc'],
                'timestamp': int(time.time()),
                'isLive': False,
                'nextMarketOpen': market_status['next_open']
            }
            
            # Cache until next market open or 24 hours, whichever is sooner
            if self.redis_available:
                try:
                    cache_duration = 24 * 60 * 60  # Default 24 hours
                    if market_status['next_open']:
                        # Calculate seconds until market opens
                        seconds_until_open = market_status['next_open'] - int(time.time())
                        if seconds_until_open > 0:
                            cache_duration = seconds_until_open
                    
                    self.redis_client.setex(
                        f"stock_price:{symbol}",
                        cache_duration,
                        json.dumps(quote_data)
                    )
                    logger.info(f"Cached quote data for {cache_duration} seconds")
                except Exception as e:
                    logger.error(f"Error caching quote data: {e}")
            
            return quote_data
            
        except Exception as e:
            logger.error(f"Error getting quote for {symbol}: {str(e)}")
            return None

    async def connect(self):
        logger.info("Client attempting to connect...")
        try:
            await self.accept()
            logger.info("Client connected successfully")
        except Exception as e:
            logger.error(f"Error during connection: {str(e)}")
            raise

    async def disconnect(self, close_code):
        logger.info(f"Client disconnecting with code: {close_code}")
        if self.update_task:
            self.update_task.cancel()
            self.update_task = None
        self.subscribed_symbols.clear()
        logger.info("Cleanup complete")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.info(f"Received message: {data}")
            
            if 'type' not in data:
                logger.warning(f"Received message without type: {data}")
                return
            
            if data['type'] == 'subscribe':
                symbol = data.get('symbol')
                if not symbol:
                    logger.warning("Subscribe message missing symbol")
                    await self.send(text_data=json.dumps({
                        'error': 'Symbol is required'
                    }))
                    return
                
                logger.info(f"Processing subscription for symbol: {symbol}")
                
                # If already subscribed, ignore
                if symbol in self.subscribed_symbols:
                    logger.info(f"Already subscribed to {symbol}")
                    return
                
                # Add to subscribed symbols
                self.subscribed_symbols.add(symbol)
                logger.info(f"Starting updates for {symbol}")
                
                # Always fetch fresh price data on subscription
                market_status = self.get_market_status()
                await self.fetch_and_cache_prices(market_status, [symbol])
                
                # Start the update task if not running
                if not self.update_task:
                    self.update_task = asyncio.create_task(self.send_periodic_updates())

            elif data['type'] == 'unsubscribe':
                symbol = data.get('symbol')
                if symbol in self.subscribed_symbols:
                    self.subscribed_symbols.remove(symbol)
                    logger.info(f"Unsubscribed from {symbol}")
                    
                    # If no more symbols, cancel the update task
                    if not self.subscribed_symbols and self.update_task:
                        self.update_task.cancel()
                        self.update_task = None
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {text_data}")
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def send_periodic_updates(self):
        """Send periodic price updates for all subscribed symbols"""
        logger.info("Starting periodic updates for all symbols")
        last_market_status = None
        try:
            while True:
                try:
                    # Get market status once for all symbols
                    market_status = self.get_market_status()
                    logger.info(f"Market status: {market_status}")

                    # Handle market closing transition
                    if last_market_status and last_market_status['is_open'] and not market_status['is_open']:
                        logger.info("Market just closed - fetching and caching final prices")
                        await self.fetch_and_cache_prices(market_status)
                    else:
                        # Update all subscribed symbols
                        for symbol in list(self.subscribed_symbols):
                            try:
                                if market_status['is_open']:
                                    # Market open - get fresh quote
                                    quote = self.finnhub_client.quote(symbol)
                                    if quote and 'c' in quote:
                                        quote_data = {
                                            'type': 'price_update',
                                            'symbol': symbol,
                                            'price': quote['c'],
                                            'change': quote['d'],
                                            'percentChange': quote['dp'],
                                            'high': quote['h'],
                                            'low': quote['l'],
                                            'open': quote['o'],
                                            'previousClose': quote['pc'],
                                            'timestamp': int(time.time()),
                                            'isLive': True,
                                            'nextMarketOpen': None
                                        }
                                        await self.send(text_data=json.dumps(quote_data))
                                        logger.info(f"Sent live update for {symbol}")
                                else:
                                    # Market closed - only use cache, don't fetch new data
                                    if self.redis_available:
                                        cached_data = self.redis_client.get(f"stock_price:{symbol}")
                                        if cached_data:
                                            cached_quote = json.loads(cached_data)
                                            cached_quote['isLive'] = False
                                            cached_quote['nextMarketOpen'] = market_status['next_open']
                                            await self.send(text_data=json.dumps(cached_quote))
                                            logger.info(f"Sent cached update for {symbol}")
                                        else:
                                            logger.warning(f"No cache available for {symbol} during closed market")
                            except Exception as e:
                                if "API limit reached" in str(e):
                                    logger.warning(f"API rate limit hit for {symbol}, will retry in next interval")
                                else:
                                    logger.error(f"Error updating {symbol}: {str(e)}")

                    # Update last market status
                    last_market_status = market_status

                    # Sleep for the update interval
                    sleep_time = self.update_interval if market_status['is_open'] else 60
                    logger.info(f"Sleeping for {sleep_time} seconds")
                    await asyncio.sleep(sleep_time)

                except Exception as e:
                    logger.error(f"Error in update loop: {str(e)}")
                    await asyncio.sleep(self.update_interval)
                    
        except asyncio.CancelledError:
            logger.info("Periodic updates cancelled")
        except Exception as e:
            logger.error(f"Error in periodic updates: {str(e)}")

    async def fetch_and_cache_prices(self, market_status, symbols=None):
        """Fetch and cache prices for specified symbols or all subscribed symbols"""
        try:
            symbols_to_fetch = symbols if symbols else list(self.subscribed_symbols)
            for symbol in symbols_to_fetch:
                try:
                    quote = self.finnhub_client.quote(symbol)
                    if quote and 'c' in quote:
                        quote_data = {
                            'type': 'price_update',
                            'symbol': symbol,
                            'price': quote['c'],
                            'change': quote['d'],
                            'percentChange': quote['dp'],
                            'high': quote['h'],
                            'low': quote['l'],
                            'open': quote['o'],
                            'previousClose': quote['pc'],
                            'timestamp': int(time.time()),
                            'isLive': market_status['is_open'],
                            'nextMarketOpen': market_status['next_open'] if not market_status['is_open'] else None
                        }
                        
                        # Cache the data if market is closed
                        if not market_status['is_open'] and self.redis_available:
                            try:
                                cache_duration = 24 * 60 * 60  # Default 24 hours
                                if market_status['next_open']:
                                    seconds_until_open = market_status['next_open'] - int(time.time())
                                    if seconds_until_open > 0:
                                        cache_duration = seconds_until_open
                                
                                self.redis_client.setex(
                                    f"stock_price:{symbol}",
                                    cache_duration,
                                    json.dumps(quote_data)
                                )
                                logger.info(f"Cached price for {symbol} for {cache_duration} seconds")
                            except Exception as e:
                                logger.error(f"Error caching price for {symbol}: {e}")
                        
                        # Send update to clients
                        await self.send(text_data=json.dumps(quote_data))
                        logger.info(f"Sent price update for {symbol}: {quote_data}")
                    else:
                        logger.error(f"Invalid quote data received for {symbol}: {quote}")
                except Exception as e:
                    logger.error(f"Error getting price for {symbol}: {e}")
        except Exception as e:
            logger.error(f"Error in fetch_and_cache_prices: {e}")

class TranscriptionConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.recognizer = None
        self.model = None
        self.closed = False
        self.buffer = []
        self.buffer_size = 8192  # Buffer size in bytes
        logger.info("TranscriptionConsumer initialized")

    async def connect(self):
        try:
            logger.info(f"WebSocket connection attempt from {self.scope['client']}")
            logger.info(f"Headers: {dict(self.scope['headers'])}")
            
            # Accept the connection first
            await self.accept()
            logger.info("WebSocket connection accepted")

            # Check if model directory exists
            model_path = Path(__file__).resolve().parent.parent / 'data' / 'vosk-model-small-en-us'
            if not model_path.exists():
                error_msg = "Voice recognition model not found. Please download the model from https://alphacephei.com/vosk/models and extract vosk-model-small-en-us.zip to backend/data/"
                logger.error(error_msg)
                await self.send(json.dumps({
                    "type": "error",
                    "message": error_msg
                }))
                await self.close(code=4000)
                return

            # Check if model files exist
            model_conf = model_path / 'conf' / 'mfcc.conf'
            if not model_conf.exists():
                error_msg = "Model files are missing or corrupted. Please ensure the model was extracted correctly."
                logger.error(error_msg)
                await self.send(json.dumps({
                    "type": "error",
                    "message": error_msg
                }))
                await self.close(code=4001)
                return

            # Initialize the model
            try:
                logger.info("Initializing Vosk model...")
                self.model = Model(str(model_path))
                self.recognizer = KaldiRecognizer(self.model, 16000)
                logger.info("Vosk model initialized successfully")
            except Exception as e:
                error_msg = f"Failed to initialize voice recognition model: {str(e)}"
                logger.error(error_msg)
                await self.send(json.dumps({
                    "type": "error",
                    "message": error_msg
                }))
                await self.close(code=4002)
                return
            
            # Send connection confirmation
            await self.send(json.dumps({
                "type": "connection_established",
                "message": "Ready to receive audio"
            }))
            logger.info("Sent connection confirmation")
            
        except Exception as e:
            error_msg = f"Connection error: {str(e)}"
            logger.error(error_msg, exc_info=True)
            if not self.closed:
                await self.send(json.dumps({
                    "type": "error",
                    "message": error_msg
                }))
                await self.close(code=4003)

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected with code: {close_code}")
        self.closed = True
        try:
            self.recognizer = None
            self.model = None
            self.buffer = []
        except Exception as e:
            logger.error(f"Error in disconnect: {str(e)}")

    async def receive(self, bytes_data=None, text_data=None):
        try:
            if text_data:
                logger.info(f"Received text data: {text_data}")
                return

            if not bytes_data:
                logger.warning("Received empty bytes data")
                return

            if not self.recognizer:
                logger.error("Recognizer not initialized")
                await self.send(json.dumps({
                    "type": "error",
                    "message": "Voice recognition not initialized"
                }))
                await self.close(code=4004)
                return

            logger.debug(f"Received audio data of size: {len(bytes_data)} bytes")
            
            # Convert bytes to numpy array
            audio_data = np.frombuffer(bytes_data, dtype=np.float32)
            logger.debug(f"Audio data range: min={np.min(audio_data)}, max={np.max(audio_data)}")
            
            # Ensure audio is properly scaled to [-1, 1]
            if np.max(np.abs(audio_data)) > 1:
                audio_data = audio_data / 32768.0
            
            # Convert float32 [-1.0, 1.0] to int16 [-32768, 32767]
            audio_data = (audio_data * 32768).astype(np.int16)
            logger.debug(f"Converted int16 range: min={np.min(audio_data)}, max={np.max(audio_data)}")
            
            # Process the audio data
            if self.recognizer.AcceptWaveform(audio_data.tobytes()):
                result = json.loads(self.recognizer.Result())
                logger.info(f"Full transcription result: {result}")
                if result.get("text"):
                    logger.info(f"Sending transcription: {result['text']}")
                    await self.send(json.dumps({
                        "type": "transcription",
                        "text": result["text"]
                    }))
            else:
                partial = json.loads(self.recognizer.PartialResult())
                logger.debug(f"Partial result: {partial}")
                if partial.get("partial"):
                    logger.info(f"Sending partial transcription: {partial['partial']}")
                    await self.send(json.dumps({
                        "type": "partial",
                        "text": partial["partial"]
                    }))
            
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}", exc_info=True)
            await self.send(json.dumps({
                "type": "error",
                "message": str(e)
            }))
            await self.close(code=4005) 