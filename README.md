# Advisor Insight at Scale

Real-time earnings call analysis platform with live stock data integration.

## Project Structure

   ``` graph
   .
   ├── backend/ # Django backend
   │ ├── backend/ # Django project settings
   │ ├── stock/ # Stock data WebSocket app
   │ └── manage.py
   └── frontend/ # React frontend
   ├── src/
   ├── public/
   └── package.json
   ```

## Backend Setup

### Prerequisites

- Python 3.8+
- Redis (for Channels layer)

### Installation & Setup

1. Create and activate virtual environment:

   ``` bash
   python -m venv venv
   source venv/bin/activate # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Environment Setup:
Create `.env` in backend directory:

   ``` bash
   FINNHUB_API_KEY=your_api_key_here
   ```

4. Database Setup:

   ```bash
   python manage.py migrate
   ```

### Running the Backend

Development:

   ``` bash
   daphne -b 0.0.0.0 -p 8000 backend.asgi:application
   ```

Production:

   ``` bash
   daphne -b 0.0.0.0 -p 8000 --access-log - --proxy-headers backend.asgi:application
   ```

## Frontend Setup

### Prerequisites-frontend

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

### Running the Frontend

Development:

   ```bash
   npm run dev
   ```

Build for production:

   ```bash
   npm run build
   ```

## WebSocket API

### Stock Price Updates

   ```bash
   Connect to: `ws://backend-production-2463.up.railway.app/ws/stock/`
   ```

Subscribe to a symbol:

   ```json
   {
      "symbol": "AAPL"
   }
   ```

Receive updates:

   ```json
   {
      "symbol": "AAPL",
      "price": 150.25,
      "change": 2.5,
      "percentChange": 1.67
   }
   ```

## Features

- Real-time stock price updates
- Earnings call audio playback
- Sentiment analysis
- Financial metrics dashboard
- Market impact analysis
- Live Q&A tracking

## Architecture

- Django Channels for WebSocket handling
- Daphne ASGI server
- Redis as channel layer
- React frontend with TypeScript
- Finnhub integration for market data

## Development Notes

- Backend uses Django Channels for WebSocket support
- Daphne serves as the ASGI server
- Redis is required for channel layer functionality
- Frontend uses Vite for development and building
- WebSocket connections are managed with reconnection logic
- Rate limiting is implemented for Finnhub API

## Production Deployment

1. Set up Redis server
2. Configure environment variables
3. Run database migrations
4. Start Daphne server
5. Serve frontend static files
6. Set up reverse proxy (nginx recommended)

## Monitoring

- Check Daphne logs for WebSocket connections
- Monitor Redis channel layer
- Watch Finnhub API rate limits
- Frontend console for connection status

## Common Issues

1. WebSocket Connection Failures
   - Check Daphne server status
   - Verify WebSocket URL in frontend
   - Check Redis connection

2. Rate Limiting
   - Monitor Finnhub API usage
   - Adjust request frequency
   - Implement caching if needed

## Security Notes

- Secure WebSocket connections in production
- Protect API keys
- Implement authentication if needed
- Use environment variables for sensitive data

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License
