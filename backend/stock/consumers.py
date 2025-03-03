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
        self.subscriptions = set()

    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        if self.current_symbol:
            self.subscriptions.remove(self.current_symbol)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if 'type' not in data:
                print(f"Received message without type: {data}")
                return
            
            if data['type'] == 'subscribe':
                symbol = data['symbol']
                self.current_symbol = symbol
                self.subscriptions.add(symbol)
                
                # Start sending periodic updates
                asyncio.create_task(self.send_periodic_updates())
                
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
        while self.current_symbol in self.subscriptions:
            try:
                quote = self.finnhub_client.quote(self.current_symbol)
                print(f"Got quote for {self.current_symbol}: {quote}")
                await self.send(text_data=json.dumps({
                    'symbol': self.current_symbol,
                    'price': quote['c'],
                    'change': quote['d'],
                    'percentChange': quote['dp']
                }))
            except Exception as e:
                print(f"Error fetching quote: {str(e)}")
            
            await asyncio.sleep(2)  # Wait for 2 seconds before next update 