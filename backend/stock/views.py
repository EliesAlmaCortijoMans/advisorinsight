from django.http import JsonResponse
import json
import os
from pathlib import Path
from django.conf import settings
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import datetime
from dotenv import load_dotenv
import logging
import socket
from urllib3.exceptions import NameResolutionError
import time
from django.core.cache import cache
from math import isnan
import redis

# Set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")

# Check if API key is available
if not FINNHUB_API_KEY:
    raise ValueError("FINNHUB_API_KEY environment variable is not set. Please add it to your .env file.")

# Create a session with enhanced retry logic
session = requests.Session()
retries = Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[502, 503, 504],
    allowed_methods=frozenset(['GET', 'POST']),  # Allow retries for GET and POST
    raise_on_status=False,  # Don't raise on status
    raise_on_redirect=False,
    respect_retry_after_header=True
)
session.mount('https://', HTTPAdapter(max_retries=retries))

# Cache settings
CACHE_TIMEOUT = 60 * 15  # 15 minutes
CACHE_KEY_PREFIX = "finnhub_earnings_"

# Company configurations
COMPANY_NAMES = {
    "AAPL": "Apple Inc.",
    "TSLA": "Tesla Inc.",
    "WMT": "Walmart Inc.",
    "IBM": "International Business Machines Corporation",
    "GME": "GameStop Corp.",
    "NVDA": "NVIDIA Corporation",
    "MSFT": "Microsoft Corporation"
}

# Divide tickers into categories
IN_PROGRESS_TICKERS = ["AAPL", "TSLA", "IBM", "NVDA", "MSFT"]
PAST_TICKER = "WMT"
UPCOMING_TICKER = "GME"

# All tickers combined
TICKERS = IN_PROGRESS_TICKERS + [PAST_TICKER, UPCOMING_TICKER]

# Mapping time status
TIME_MAPPING = {
    "ongoing": "dmh",  # During Market Hours
    "past": "amc",  # After Market Close
    "upcoming": "bmo"  # Before Market Open
}

def get_transcript(request, company_symbol, transcript_id):
    try:
        transcript_path = Path(settings.BASE_DIR) / 'data' / company_symbol / 'transcripts' / f'{transcript_id}.json'
        print(f"Looking for transcript at: {transcript_path}")  # Debug log
        
        if not transcript_path.exists():
            print(f"File not found: {transcript_path}")  # Debug log
            return JsonResponse({'error': 'Transcript not found'}, status=404)
            
        with open(transcript_path, 'r') as f:
            transcript_data = json.load(f)
        return JsonResponse(transcript_data)
    except Exception as e:
        print(f"Error in get_transcript: {str(e)}")  # Debug log
        return JsonResponse({'error': str(e)}, status=500)

def get_audio_history(request, symbol):
    try:
        transcript_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'transcripts'
        audio_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'audios'
        
        # Create audio directory if it doesn't exist
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        audio_history = []
        
        for transcript_file in transcript_dir.glob('*.json'):
            with open(transcript_file, 'r') as f:
                transcript_data = json.load(f)
            
            audio_file_name = f"{transcript_file.stem}.mp3"
            audio_file_path = audio_dir / audio_file_name
            
            # Use relative URL for audio files instead of hardcoded localhost
            audio_url = f'/media/{symbol}/audios/{audio_file_name}'
            
            audio_history.append({
                'id': transcript_file.stem,
                'title': transcript_data.get('title', 'Earnings Call'),
                'time': transcript_data.get('time', ''),
                'audioUrl': audio_url,
                'audioAvailable': audio_file_path.exists()
            })
        
        if not audio_history:
            return JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
        
        audio_history.sort(key=lambda x: x.get('time', ''), reverse=True)
        
        return JsonResponse({
            'success': True,
            'audioHistory': audio_history
        })
        
    except Exception as e:
        print(f"Error in get_audio_history: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def get_company_transcripts(request, symbol):
    try:
        # Initialize Redis client
        redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=0,
            decode_responses=True
        )
        
        cache_key = f"transcripts:{symbol}"
        
        # Use Redis pipeline for better performance
        with redis_client.pipeline() as pipe:
            # Check if transcripts exist in cache
            pipe.exists(cache_key)
            pipe.get(cache_key)
            exists, cached_transcripts = pipe.execute()
            
            if exists:
                logger.info(f"Using cached transcripts for {symbol}")
                return JsonResponse({
                    'success': True,
                    'transcripts': json.loads(cached_transcripts)
                })
        
        # If not in cache, get from filesystem
        base_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'transcripts'
        logger.info(f"Looking for transcripts in: {base_dir}")
        
        if not os.path.exists(base_dir):
            logger.warning(f"Directory not found: {base_dir}")
            return JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
        
        # Get all transcript files for the company
        transcript_files = sorted(
            [f for f in os.listdir(base_dir) if f.endswith('.json')],
            reverse=True  # Most recent first
        )
        logger.info(f"Found transcript files: {transcript_files}")
        
        transcripts = []
        for file_name in transcript_files:
            try:
                with open(base_dir / file_name, 'r') as f:
                    transcript_data = json.load(f)
                    transcripts.append(transcript_data)
            except Exception as e:
                logger.error(f"Error reading file {file_name}: {str(e)}")
                continue
        
        if not transcripts:
            return JsonResponse({
                'success': False,
                'error': 'No valid transcripts found'
            }, status=404)
        
        # Cache the transcripts in Redis using pipeline
        try:
            with redis_client.pipeline() as pipe:
                pipe.setex(
                    cache_key,
                    24 * 60 * 60,  # 24 hours
                    json.dumps(transcripts)
                )
                pipe.execute()
                logger.info(f"Cached transcripts for {symbol}")
        except Exception as e:
            logger.error(f"Error caching transcripts: {str(e)}")
        
        return JsonResponse({
            'success': True,
            'transcripts': transcripts
        })
    except Exception as e:
        logger.error(f"Error in get_company_transcripts: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def fetch_earnings(from_date, to_date, symbol):
    """Fetch earnings calendar from Finnhub API using HTTP requests with caching"""
    cache_key = f"{CACHE_KEY_PREFIX}{symbol}_{from_date}_{to_date}"
    
    # Try to get cached data first
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        logger.info(f"Using cached data for {symbol}")
        return cached_data
    
    url = "https://finnhub.io/api/v1/calendar/earnings"
    params = {
        "from": from_date,
        "to": to_date,
        "symbol": symbol,
        "token": FINNHUB_API_KEY
    }
    
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Try to resolve the hostname first
            try:
                socket.gethostbyname('finnhub.io')
            except socket.gaierror as e:
                logger.warning(f"DNS resolution failed for finnhub.io: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                # On final attempt, try to use cached data if available
                if cached_data is not None:
                    logger.warning(f"Using stale cached data for {symbol} due to DNS error")
                    return cached_data
                raise
            
            response = session.get(url, params=params, timeout=120)
            
            # Handle 502 Bad Gateway specifically
            if response.status_code == 502:
                logger.warning(f"Received 502 from Finnhub for {symbol} (attempt {attempt + 1})")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                # On final attempt with 502, use cached data if available
                if cached_data is not None:
                    logger.warning(f"Using stale cached data for {symbol} due to 502 error")
                    return cached_data
                
            response.raise_for_status()
            data = response.json().get("earningsCalendar", [])
            
            # Cache successful response
            cache.set(cache_key, data, CACHE_TIMEOUT)
            return data
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request failed for {symbol} (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay * (attempt + 1))
                continue
            # On final attempt, try to use cached data
            if cached_data is not None:
                logger.warning(f"Using stale cached data for {symbol} due to request error")
                return cached_data
            logger.error(f"All attempts failed for {symbol}: {e}")
            raise
            
        except Exception as e:
            logger.error(f"Unexpected error fetching data for {symbol}: {e}")
            # Try to use cached data on unexpected errors
            if cached_data is not None:
                logger.warning(f"Using stale cached data for {symbol} due to unexpected error")
                return cached_data
            raise

def format_eps(value):
    """Format EPS value as currency."""
    try:
        if value is not None and value != "":
            float_value = float(value)
            if not isnan(float_value):
                return float_value
        return None
    except (ValueError, TypeError):
        return None

def get_earnings_schedule():
    """Function to fetch past, current, and upcoming earnings with time shifting."""
    today = datetime.date.today()
    # Look back/forward 2 years to ensure we find sufficient data
    past_date = today - datetime.timedelta(days=730)
    future_date = today + datetime.timedelta(days=730)
    
    all_earnings_data = {}
    failed_tickers = []
    
    # First, fetch all earnings data for all tickers
    for ticker in TICKERS:
        try:
            earnings = fetch_earnings(from_date=str(past_date), to_date=str(future_date), symbol=ticker)
            all_earnings_data[ticker] = sorted(earnings, key=lambda x: x.get("date", ""))
        except Exception as e:
            logger.error(f"Error fetching data for {ticker}: {e}")
            failed_tickers.append(ticker)
            # Try to get cached data as fallback
            cache_key = f"{CACHE_KEY_PREFIX}{ticker}_{str(past_date)}_{str(future_date)}"
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.info(f"Using cached data as fallback for {ticker}")
                all_earnings_data[ticker] = sorted(cached_data, key=lambda x: x.get("date", ""))
            else:
                all_earnings_data[ticker] = []
    
    if failed_tickers:
        logger.warning(f"Failed to fetch fresh data for tickers: {', '.join(failed_tickers)}")
    
    # Prepare result containers
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
    
    return earnings_data

def get_earnings_schedule_view(request):
    """Django view function to handle earnings schedule requests."""
    try:
        earnings_data = get_earnings_schedule()
        return JsonResponse({
            'success': True,
            'earnings': earnings_data,
            'timestamp': datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in earnings schedule view: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e),
            'timestamp': datetime.datetime.now().isoformat()
        }, status=500)