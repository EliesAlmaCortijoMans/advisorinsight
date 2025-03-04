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
        
        self.current_symbol = None
        self.update_task = None
        self.last_quote_time = 0
        self.quote_cooldown = 2.0  # 2 seconds between quotes

    def get_market_status(self):
        """Get current market status and next opening time"""
        try:
            market_data = self.finnhub_client.market_status(exchange='US')
            is_open = market_data.get('isOpen', False)
            
            # Get current time in US/Eastern
            eastern = pytz.timezone('US/Eastern')
            now = datetime.now(eastern)
            
            # Calculate next market open time
            next_open = None
            if not is_open:
                # If it's weekend, calculate next Monday
                if now.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
                    days_until_monday = (7 - now.weekday()) % 7
                    next_open = now.replace(hour=9, minute=30, second=0, microsecond=0) + timedelta(days=days_until_monday)
                else:
                    # If it's before market hours today
                    market_open_today = now.replace(hour=9, minute=30, second=0, microsecond=0)
                    if now < market_open_today:
                        next_open = market_open_today
                    else:
                        # If it's after market hours, set to next day
                        next_open = (now + timedelta(days=1)).replace(hour=9, minute=30, second=0, microsecond=0)
                
                # Convert to timestamp
                next_open_ts = int(next_open.timestamp()) if next_open else None
            else:
                next_open_ts = None
            
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
            # Check cache first if Redis is available
            if self.redis_available:
                cached_data = self.redis_client.get(f"stock_price:{symbol}")
                if cached_data:
                    return json.loads(cached_data)
            
            # Get fresh quote from Finnhub
            quote = self.finnhub_client.quote(symbol)
            if not quote or 'c' not in quote:
                logger.error(f"Invalid quote data received for {symbol}: {quote}")
                return None
            
            # Get market status
            market_status = self.get_market_status()
            
            # Format the quote data
            quote_data = {
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
            
            # Cache the data if market is closed and Redis is available
            if not market_status['is_open'] and self.redis_available:
                try:
                    self.redis_client.setex(
                        f"stock_price:{symbol}",
                        24 * 60 * 60,  # Cache for 24 hours
                        json.dumps(quote_data)
                    )
                except Exception as e:
                    logger.error(f"Error caching quote data: {e}")
            
            logger.info(f"Got quote for {symbol}: {quote_data}")
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
        await self.cleanup_tasks()

    async def cleanup_tasks(self):
        logger.info("Cleaning up tasks...")
        if self.update_task:
            self.update_task.cancel()
            try:
                await self.update_task
            except asyncio.CancelledError:
                pass
            self.update_task = None
        self.current_symbol = None
        logger.info("Tasks cleaned up")

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
                
                # If it's the same symbol, ignore
                if symbol == self.current_symbol:
                    logger.info(f"Already subscribed to {symbol}")
                    return
                
                # Clean up existing tasks
                await self.cleanup_tasks()
                
                # Set new symbol and start updates
                self.current_symbol = symbol
                logger.info(f"Starting updates for {symbol}")
                
                # Get initial quote immediately
                quote_data = self.get_quote(symbol)
                if quote_data:
                    await self.send(text_data=json.dumps(quote_data))
                    
                    # Only start periodic updates if market is open
                    if quote_data.get('isLive', False):
                        self.update_task = asyncio.create_task(self.send_periodic_updates())
                    else:
                        logger.info(f"Market is closed. Using cached data for {symbol}")
                
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
        logger.info(f"Starting periodic updates for {self.current_symbol}")
        try:
            while True:
                try:
                    if not self.current_symbol:
                        logger.warning("No current symbol, stopping updates")
                        break
                    
                    # Check market status
                    market_status = self.get_market_status()
                    if not market_status['is_open']:
                        logger.info("Market closed, stopping periodic updates")
                        break
                        
                    # Calculate time to wait
                    current_time = time.time()
                    time_since_last = current_time - self.last_quote_time
                    
                    # Wait until cooldown period has passed
                    if time_since_last < self.quote_cooldown:
                        await asyncio.sleep(self.quote_cooldown - time_since_last)
                    
                    # Get and send quote
                    quote_data = self.get_quote(self.current_symbol)
                    if quote_data:
                        self.last_quote_time = time.time()
                        await self.send(text_data=json.dumps(quote_data))
                    
                    # Sleep for cooldown period
                    await asyncio.sleep(self.quote_cooldown)
                    
                except Exception as e:
                    logger.error(f"Error in update loop: {str(e)}")
                    if "API limit reached" in str(e):
                        logger.warning("API rate limit hit, waiting 60 seconds...")
                        await asyncio.sleep(60)  # Wait longer on rate limit
                        continue
                    await asyncio.sleep(self.quote_cooldown)  # Wait on other errors
                    
        except asyncio.CancelledError:
            logger.info(f"Periodic updates cancelled for {self.current_symbol}")
        except Exception as e:
            logger.error(f"Error in periodic updates: {str(e)}")
        finally:
            logger.info(f"Stopping periodic updates for {self.current_symbol}") 