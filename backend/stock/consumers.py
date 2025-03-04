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
            
            # Only use cache if market is closed
            if self.redis_available:
                cached_data = self.redis_client.get(f"stock_price:{symbol}")
                if cached_data:
                    logger.info(f"Using cached data for {symbol}")
                    return json.loads(cached_data)
            
            # If no cache, get quote anyway
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
                'isLive': market_status['is_open'],
                'nextMarketOpen': market_status['next_open']
            }
            
            # Cache the data if market is closed
            if not market_status['is_open'] and self.redis_available:
                try:
                    self.redis_client.setex(
                        f"stock_price:{symbol}",
                        24 * 60 * 60,  # Cache for 24 hours
                        json.dumps(quote_data)
                    )
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
                
                # Get initial quote immediately
                quote_data = self.get_quote(symbol)
                if quote_data:
                    await self.send(text_data=json.dumps(quote_data))
                
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
        try:
            while True:
                try:
                    # Get market status once for all symbols
                    market_status = self.get_market_status()
                    logger.info(f"Market status: {market_status}")

                    # Update all subscribed symbols
                    for symbol in list(self.subscribed_symbols):
                        try:
                            quote_data = self.get_quote(symbol)
                            if quote_data:
                                logger.info(f"Sending update for {symbol}: {quote_data}")
                                await self.send(text_data=json.dumps(quote_data))
                        except Exception as e:
                            if "API limit reached" in str(e):
                                logger.warning(f"API rate limit hit for {symbol}, will retry in next interval")
                            else:
                                logger.error(f"Error getting quote for {symbol}: {str(e)}")

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