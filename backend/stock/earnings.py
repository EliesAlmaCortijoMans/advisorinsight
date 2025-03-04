import datetime
import json
import os
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from dotenv import load_dotenv
from django.http import JsonResponse

# Load environment variables from .env file
load_dotenv()

# Get the API key from environment variable
FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")

# Check if API key is available
if not FINNHUB_API_KEY:
    raise ValueError("FINNHUB_API_KEY environment variable is not set. Please add it to your .env file.")

# Create a session with retry logic
session = requests.Session()
retries = Retry(total=5, backoff_factor=1, status_forcelist=[502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))

# Divide tickers into categories
IN_PROGRESS_TICKERS = ["AAPL", "TSLA", "IBM", "NVDA", "MSFT"]
PAST_TICKER = "WMT"
UPCOMING_TICKER = "GME"

# Mapping company names
COMPANY_NAMES = {
    "AAPL": "Apple Inc.",
    "TSLA": "Tesla Inc.",
    "WMT": "Walmart Inc.",
    "IBM": "International Business Machines Corporation",
    "GME": "GameStop Corp.",
    "NVDA": "NVIDIA Corporation",
    "MSFT": "Microsoft Corporation"
}

# Mapping time status
TIME_MAPPING = {
    "ongoing": "dmh",  # During Market Hours
    "past": "amc",  # After Market Close
    "upcoming": "bmo"  # Before Market Open
}

def fetch_earnings(from_date, to_date, symbol):
    """Fetch earnings calendar from Finnhub API using HTTP requests"""
    url = "https://finnhub.io/api/v1/calendar/earnings"
    params = {
        "from": from_date,
        "to": to_date,
        "symbol": symbol,
        "token": FINNHUB_API_KEY
    }
    response = session.get(url, params=params, timeout=120)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json().get("earningsCalendar", [])

def format_eps(value):
    """Format EPS value as currency."""
    if value is not None:
        return f"${float(value):.2f}"
    return None

def get_earnings_schedule_view(request):
    """View function to fetch past, current, and upcoming earnings with time shifting."""
    try:
        today = datetime.date.today()
        # Look back/forward 2 years to ensure we find sufficient data
        past_date = today - datetime.timedelta(days=730)
        future_date = today + datetime.timedelta(days=730)
        
        all_earnings_data = {}
        
        # First, fetch all earnings data for all tickers
        for ticker in IN_PROGRESS_TICKERS + [PAST_TICKER, UPCOMING_TICKER]:
            try:
                earnings = fetch_earnings(from_date=str(past_date), to_date=str(future_date), symbol=ticker)
                all_earnings_data[ticker] = sorted(earnings, key=lambda x: x.get("date", ""))
            except Exception as e:
                print(f"Error fetching data for {ticker}: {str(e)}")
                all_earnings_data[ticker] = []
        
        earnings_data = []
        
        # Process the PAST_TICKER first - find the most recent past earnings
        if all_earnings_data.get(PAST_TICKER):
            past_earnings = [e for e in all_earnings_data[PAST_TICKER] if e.get("date", "") < str(today)]
            if past_earnings:
                most_recent = past_earnings[-1]
                earnings_data.append({
                    "company": COMPANY_NAMES[PAST_TICKER],
                    "symbol": PAST_TICKER,
                    "date": most_recent.get("date"),
                    "time": TIME_MAPPING["past"],
                    "status": "past",
                    "expectedEPS": format_eps(most_recent.get("epsEstimate")),
                    "actualEPS": format_eps(most_recent.get("epsActual"))
                })
        
        # Process the UPCOMING_TICKER next - find the next upcoming earnings
        if all_earnings_data.get(UPCOMING_TICKER):
            future_earnings = [e for e in all_earnings_data[UPCOMING_TICKER] if e.get("date", "") > str(today)]
            if future_earnings:
                next_earnings = future_earnings[0]
                earnings_data.append({
                    "company": COMPANY_NAMES[UPCOMING_TICKER],
                    "symbol": UPCOMING_TICKER,
                    "date": next_earnings.get("date"),
                    "time": TIME_MAPPING["upcoming"],
                    "status": "upcoming",
                    "expectedEPS": format_eps(next_earnings.get("epsEstimate"))
                })
        
        # Process the ONGOING tickers - use the most recent data as a reference
        for ticker in IN_PROGRESS_TICKERS:
            if all_earnings_data.get(ticker):
                # First try to find the most recent past earnings
                past_ticker_earnings = [e for e in all_earnings_data[ticker] if e.get("date", "") < str(today)]
                future_ticker_earnings = [e for e in all_earnings_data[ticker] if e.get("date", "") > str(today)]
                
                source_data = None
                if past_ticker_earnings:
                    source_data = past_ticker_earnings[-1]  # Most recent past
                elif future_ticker_earnings:
                    source_data = future_ticker_earnings[0]  # Next upcoming
                
                if source_data:
                    earnings_data.append({
                        "company": COMPANY_NAMES[ticker],
                        "symbol": ticker,
                        "date": str(today),  # Always today for ongoing
                        "time": TIME_MAPPING["ongoing"],
                        "status": "ongoing",
                        "expectedEPS": format_eps(source_data.get("epsEstimate"))
                    })
                else:
                    # Fallback with placeholder if no data found
                    earnings_data.append({
                        "company": COMPANY_NAMES[ticker],
                        "symbol": ticker,
                        "date": str(today),
                        "time": TIME_MAPPING["ongoing"],
                        "status": "ongoing",
                        "expectedEPS": None
                    })
        
        return JsonResponse({
            'success': True,
            'earnings': earnings_data
        })
        
    except Exception as e:
        print(f"Error fetching earnings schedule: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500) 