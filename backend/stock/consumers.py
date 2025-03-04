import json
from channels.generic.websocket import AsyncWebsocketConsumer
import finnhub
import os
from dotenv import load_dotenv
import asyncio
import threading
import time

load_dotenv()

class StockConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.finnhub_client = finnhub.Client(api_key=os.getenv('FINNHUB_API_KEY'))
        self.current_symbol = None
        self.update_task = None
        self.last_quote_time = 0
        self.quote_cooldown = 2.0  # 2 seconds between quotes

    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        await self.cleanup_tasks()

    async def cleanup_tasks(self):
        if self.update_task:
            self.update_task.cancel()
            try:
                await self.update_task
            except asyncio.CancelledError:
                pass
            self.update_task = None
        self.current_symbol = None

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if 'type' not in data:
                print(f"Received message without type: {data}")
                return
            
            if data['type'] == 'subscribe':
                symbol = data['symbol']
                
                # If it's the same symbol, ignore
                if symbol == self.current_symbol:
                    return
                
                # Clean up existing tasks
                await self.cleanup_tasks()
                
                # Set new symbol and start updates
                self.current_symbol = symbol
                self.update_task = asyncio.create_task(self.send_periodic_updates())
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))
        except Exception as e:
            print(f"Error in receive: {str(e)}")
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def send_periodic_updates(self):
        print(f"Starting periodic updates for {self.current_symbol}")
        try:
            while True:
                try:
                    # Calculate time to wait
                    current_time = time.time()
                    time_since_last = current_time - self.last_quote_time
                    
                    # Wait until cooldown period has passed
                    if time_since_last < self.quote_cooldown:
                        await asyncio.sleep(self.quote_cooldown - time_since_last)
                    
                    # Only fetch if this is still the current symbol
                    if not self.current_symbol:
                        break
                        
                    # Fetch and send quote
                    quote = self.finnhub_client.quote(self.current_symbol)
                    self.last_quote_time = time.time()
                    
                    print(f"Got quote for {self.current_symbol}: {quote}")
                    await self.send(text_data=json.dumps({
                        'symbol': self.current_symbol,
                        'price': quote['c'],
                        'change': quote['d'],
                        'percentChange': quote['dp']
                    }))
                    
                except Exception as e:
                    print(f"Error fetching quote: {str(e)}")
                    if "API limit reached" in str(e):
                        print("API rate limit hit, waiting 60 seconds...")
                        await asyncio.sleep(60)  # Wait longer on rate limit
                        continue
                    await asyncio.sleep(self.quote_cooldown)  # Wait on other errors
                    
        except asyncio.CancelledError:
            print(f"Periodic updates cancelled for {self.current_symbol}")
        except Exception as e:
            print(f"Error in periodic updates: {str(e)}")
        finally:
            print(f"Stopping periodic updates for {self.current_symbol}") 