import asyncio
import json
import websockets
from websocket._app import WebSocketApp
import finnhub
import datetime
from dotenv import load_dotenv
import os
import threading

class StockServer:
    def __init__(self, host="localhost", port=8765):
        # Load environment variables and initialize Finnhub client
        load_dotenv()
        self.FINNHUB_API_KEY = os.environ.get('FINNHUB_API_KEY')
        self.finnhub_client = finnhub.Client(api_key=self.FINNHUB_API_KEY)
        
        # Market status (Eastern Time)
        self.is_market_open = self.finnhub_client.market_status(exchange='US')['isOpen']
        
        # Active client connections and stock cache
        self.active_connections = set()
        self.stock_cache = {}
        
        # Finnhub websocket and subscriptions
        self.finnhub_ws = None
        self.finnhub_subscriptions = set()
        
        # Host and port for the websocket server
        self.host = host
        self.port = port

    async def get_stock_data_rest(self, symbol):
        """Get stock data using Finnhub REST API."""
        try:
            quote = self.finnhub_client.quote(symbol)
            data = {
                'source': 'rest',
                'price': quote['c'],  # Current price
            }
            # Update cache
            self.stock_cache[symbol] = {
                'data': data,
                'timestamp': datetime.datetime.now()
            }
            return data
        except Exception as e:
            print(f"Error fetching REST data for {symbol}: {e}")
            return {
                'type': 'error',
                'symbol': symbol,
                'message': f"Failed to fetch data: {str(e)}"
            }

    def on_finnhub_message(self, ws, message):
        """Handle incoming messages from Finnhub websocket."""
        try:
            data = json.loads(message)
            if data.get('type') == 'trade':
                for trade in data.get('data', []):
                    symbol = trade.get('s')
                    price = trade.get('p')
                    if symbol and price:
                        formatted_data = {
                            'price': price,
                            'source': 'websocket'
                        }
                        # Update cache
                        self.stock_cache[symbol] = {
                            'data': formatted_data,
                            'timestamp': datetime.datetime.now()
                        }
                        # Broadcast to clients
                        asyncio.run(self.broadcast_to_subscribers(symbol, formatted_data))
        except Exception as e:
            print(f"Error processing Finnhub message: {e}")
            print(f"Message: {message}")

    def on_finnhub_error(self, ws, error):
        """Handle Finnhub websocket errors."""
        print(f"Finnhub WebSocket Error: {error}")

    def on_finnhub_close(self, ws, close_status_code, close_msg):
        """Handle Finnhub websocket connection closing."""
        print(f"Finnhub WebSocket connection closed: {close_status_code} - {close_msg}")
        asyncio.run(self.reconnect_finnhub_ws())

    async def reconnect_finnhub_ws(self):
        """Reconnect to Finnhub websocket after a delay."""
        await asyncio.sleep(5)
        await self.initialize_finnhub_ws()

    def on_finnhub_open(self, ws):
        """Handle Finnhub websocket connection opening."""
        print("Finnhub WebSocket connection opened")
        # Resubscribe to all symbols
        for symbol in self.finnhub_subscriptions:
            ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))

    async def initialize_finnhub_ws(self):
        """Initialize connection to Finnhub websocket."""
        try:
            # Close existing connection if any
            if self.finnhub_ws:
                self.finnhub_ws.close()
            # Create new connection
            self.finnhub_ws = WebSocketApp(
                f"wss://ws.finnhub.io?token={self.FINNHUB_API_KEY}",
                on_message=self.on_finnhub_message,
                on_error=self.on_finnhub_error,
                on_close=self.on_finnhub_close
            )
            self.finnhub_ws.on_open = self.on_finnhub_open
            # Run the websocket connection in a separate thread
            ws_thread = threading.Thread(target=self.finnhub_ws.run_forever)
            ws_thread.daemon = True
            ws_thread.start()
            print("Finnhub WebSocket initialized")
        except Exception as e:
            print(f"Error initializing Finnhub WebSocket: {e}")

    async def subscribe_to_finnhub(self, symbol):
        """Subscribe to a symbol on Finnhub websocket."""
        if symbol not in self.finnhub_subscriptions:
            self.finnhub_subscriptions.add(symbol)
            if self.finnhub_ws and self.finnhub_ws.sock and self.finnhub_ws.sock.connected:
                self.finnhub_ws.send(json.dumps({"type": "quote", "symbol": symbol}))
                print(f"Subscribed to {symbol} on Finnhub")

    async def broadcast_to_subscribers(self, symbol, data):
        """Broadcast data to all clients subscribed to a symbol."""
        message = json.dumps(data)
        for client_ws in self.active_connections:
            if hasattr(client_ws, 'subscriptions') and symbol in client_ws.subscriptions:
                try:
                    await client_ws.send(message)
                except Exception as e:
                    print(f"Error sending to client: {e}")

    async def handle_client(self, websocket):
        """Handle client websocket connection."""
        print("New client connected")
        self.active_connections.add(websocket)
        websocket.subscriptions = set()
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    symbol = data.get('symbol', '').upper()
                    if not symbol:
                        await websocket.send(json.dumps({
                            'type': 'error',
                            'message': 'Symbol is required'
                        }))
                        continue
                    websocket.subscriptions.add(symbol)
                    print(f"Market status for {symbol}: {'OPEN' if self.is_market_open else 'CLOSED'}")
                    if self.is_market_open:
                        # Use Finnhub websocket
                        await self.subscribe_to_finnhub(symbol)
                        if symbol in self.stock_cache:
                            cached_data = self.stock_cache[symbol]['data']
                            await websocket.send(json.dumps(cached_data))
                    else:
                        # Use REST API for closed market
                        data = await self.get_stock_data_rest(symbol)
                        await websocket.send(json.dumps(data))
                        asyncio.create_task(self.periodic_rest_updates(symbol))
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': 'Invalid JSON'
                    }))
                except Exception as e:
                    print(f"Error handling client message: {e}")
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': f'Server error: {str(e)}'
                    }))
        finally:
            self.active_connections.remove(websocket)
            print("Client disconnected")

    async def periodic_rest_updates(self, symbol):
        """Periodically send REST API updates for a symbol when market is closed."""
        cache_key = f"rest_update_task_{symbol}"
        if cache_key in self.stock_cache:
            return
        self.stock_cache[cache_key] = True
        try:
            while True:
                if self.is_market_open:
                    del self.stock_cache[cache_key]
                    return
                has_subscribers = any(symbol in ws.subscriptions for ws in self.active_connections)
                if not has_subscribers:
                    del self.stock_cache[cache_key]
                    return
                data = await self.get_stock_data_rest(symbol)
                await self.broadcast_to_subscribers(symbol, data)
                await asyncio.sleep(10)
        except Exception as e:
            print(f"Error in periodic REST updates for {symbol}: {e}")
            if cache_key in self.stock_cache:
                del self.stock_cache[cache_key]

    async def run(self):
        """Run the StockServer: initialize Finnhub websocket and start the server."""
        await self.initialize_finnhub_ws()
        server = await websockets.serve(self.handle_client, self.host, self.port)
        print(f"WebSocket server started at wss://{self.host}:{self.port}")
        await server.wait_closed()

if __name__ == "__main__":
    server = StockServer()
    asyncio.run(server.run())