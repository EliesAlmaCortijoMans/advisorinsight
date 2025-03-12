from django.http import JsonResponse
import json
import os
from pathlib import Path
from django.conf import settings
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
from datetime import datetime, timedelta, date
import logging
import socket
import time
from django.core.cache import cache
from math import isnan
import redis
from rest_framework.decorators import api_view
from rest_framework.response import Response
from openai import OpenAI
import finnhub
from dotenv import load_dotenv
import random
from langchain.prompts import ChatPromptTemplate
from langchain.chains.llm import LLMChain
from langchain.chat_models import ChatOpenAI
from langchain.schema import BaseOutputParser
from .earnings_analyzer import EarningsCallAnalyzer

# Set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Set up LLM
llm = ChatOpenAI(
    model="gpt-3.5-turbo-16k",
    temperature=0.3,
    api_key=settings.OPENAI_API_KEY
)

# Set up JSON parser
class QAAnalysisParser(BaseOutputParser):
    def parse(self, text: str) -> dict:
        try:
            # Remove any markdown formatting if present
            clean_text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing LLM output: {e}")
            logger.error(f"Raw text: {text}")
            return {
                "response_quality": 0,
                "questions_addressed": 0,
                "follow_up_questions": 0
            }

parser = QAAnalysisParser()

# Use settings.FINNHUB_API_KEY instead of loading directly from environment
finnhub_client = finnhub.Client(api_key=settings.FINNHUB_API_KEY)

# Create a session with enhanced retry logic
session = requests.Session()
retries = Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[502, 503, 504],
    allowed_methods=frozenset(['GET', 'POST']),
    raise_on_status=False,
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
        print(f"Fetching audio history for symbol: {symbol}")
        transcript_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'transcripts'
        audio_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'audios'
        
        print(f"Checking directories - Transcript dir: {transcript_dir}, Audio dir: {audio_dir}")
        
        # Check if directories exist
        if not transcript_dir.exists():
            print(f"Transcript directory does not exist for {symbol}")
            return JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
        
        # Create audio directory if it doesn't exist
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        audio_history = []
        
        for transcript_file in transcript_dir.glob('*.json'):
            print(f"Processing transcript file: {transcript_file}")
            with open(transcript_file, 'r') as f:
                transcript_data = json.load(f)
            
            audio_file_name = f"{transcript_file.stem}.mp3"
            audio_file_path = audio_dir / audio_file_name
            
            # Use relative URL for audio files
            audio_url = f'/media/{symbol}/audios/{audio_file_name}'
            
            print(f"Checking audio file: {audio_file_path}")
            audio_exists = audio_file_path.exists()
            print(f"Audio file exists: {audio_exists}")
            
            audio_history.append({
                'id': transcript_file.stem,
                'title': transcript_data.get('title', 'Earnings Call'),
                'time': transcript_data.get('time', ''),
                'audioUrl': audio_url,
                'audioAvailable': audio_exists
            })
        
        if not audio_history:
            print(f"No audio history found for {symbol}")
            return JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
        
        audio_history.sort(key=lambda x: x.get('time', ''), reverse=True)
        print(f"Returning audio history for {symbol}: {audio_history}")
        
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
        "token": settings.FINNHUB_API_KEY
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
    today = date.today()
    # Look back/forward 2 years to ensure we find sufficient data
    past_date = today - timedelta(days=730)
    future_date = today + timedelta(days=730)
    
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

@api_view(['GET'])
def get_earnings_schedule_view(request):
    """Django view function to handle earnings schedule requests."""
    try:
        logger.info("Fetching earnings schedule")
        earnings_data = get_earnings_schedule()
        response = JsonResponse({
            'success': True,
            'earnings': earnings_data,
            'timestamp': datetime.now().isoformat()
        })
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    except Exception as e:
        logger.error(f"Error in earnings schedule view: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }, status=500)

@api_view(['POST'])
def transcribe_audio(request):
    try:
        audio_url = request.data.get('audio_url')
        if not audio_url:
            return Response({'success': False, 'error': 'No audio URL provided'}, status=400)

        # Get the actual file path from the URL
        relative_path = audio_url.replace('http://localhost:8000', '')
        file_path = os.path.join(settings.MEDIA_ROOT, *relative_path.split('/')[2:])

        if not os.path.exists(file_path):
            return Response({'success': False, 'error': 'Audio file not found'}, status=404)

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Create transcription using OpenAI's Whisper model
        with open(file_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en"
            )

        return Response({
            'success': True,
            'transcription': response.text
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
def company_news(request):
    symbol = request.GET.get('symbol')
    if not symbol:
        return JsonResponse({'error': 'Symbol is required'}, status=400)

    try:
        logger.info(f"Fetching news for symbol: {symbol}")
        
        # Get news from the last 30 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        logger.info(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        if not settings.FINNHUB_API_KEY:
            logger.error("FINNHUB_API_KEY not found in settings")
            return JsonResponse({'error': 'Finnhub API key not configured'}, status=500)
            
        news = finnhub_client.company_news(
            symbol,
            _from=start_date.strftime('%Y-%m-%d'),
            to=end_date.strftime('%Y-%m-%d')
        )
        
        logger.info(f"Successfully fetched {len(news)} news items")
        response = JsonResponse(news, safe=False)
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Failed to fetch news: {str(e)}'}, status=500)

@api_view(['GET'])
def stock_social_sentiment(request):
    symbol = request.GET.get('symbol')
    if not symbol:
        return JsonResponse({'error': 'Symbol is required'}, status=400)

    try:
        logger.info(f"Fetching social sentiment for symbol: {symbol}")
        
        if not settings.FINNHUB_API_KEY:
            logger.error("FINNHUB_API_KEY not found in settings")
            return JsonResponse({'error': 'Finnhub API key not configured'}, status=500)
            
        logger.info(f"Using Finnhub API key: {settings.FINNHUB_API_KEY[:10]}...")
        
        # Get sentiment data from Finnhub
        sentiment = finnhub_client.stock_social_sentiment(symbol)
        logger.info(f"Raw Finnhub response: {sentiment}")
        
        # Process and format the data
        reddit_data = sentiment.get('reddit', [])
        twitter_data = sentiment.get('twitter', [])
        
        logger.info(f"Reddit data count: {len(reddit_data)}")
        logger.info(f"Twitter data count: {len(twitter_data)}")
        logger.info(f"Sample Reddit mention: {reddit_data[0] if reddit_data else 'No Reddit data'}")
        logger.info(f"Sample Twitter mention: {twitter_data[0] if twitter_data else 'No Twitter data'}")
        
        # Combine and sort data by time
        all_data = []
        total_mentions = 0
        for item in reddit_data + twitter_data:
            mention_count = item.get('mention', 0)
            total_mentions += mention_count
            logger.info(f"Processing item with mentions: {mention_count}")
            
            positive_score = item.get('positiveScore', 0)
            negative_score = abs(item.get('negativeScore', 0))
            total_score = positive_score + negative_score
            
            # Calculate normalized sentiment score between -1 and 1
            sentiment_score = 0
            if total_score > 0:
                sentiment_score = (positive_score - negative_score) / total_score
            
            all_data.append({
                'atTime': item.get('atTime'),
                'mention': item.get('mention', 0),
                'positiveScore': positive_score,
                'negativeScore': negative_score,
                'positiveMention': item.get('positiveMention', 0),
                'negativeMention': item.get('negativeMention', 0),
                'score': sentiment_score
            })
        
        # Sort by time
        all_data.sort(key=lambda x: x['atTime'], reverse=True)
        logger.info(f"Processed data count: {len(all_data)}")
        
        if not all_data:
            logger.warning(f"No sentiment data available for {symbol}, generating mock data")
            # Generate mock data for the last 24 hours
            now = datetime.now()
            mock_data = []
            base_sentiment = random.uniform(0.3, 0.7)  # Random base sentiment between 0.3 and 0.7
            
            for i in range(24):
                time_point = now - timedelta(hours=i)
                sentiment_variation = random.uniform(-0.1, 0.1)  # Add some random variation
                sentiment_score = max(-1, min(1, base_sentiment + sentiment_variation))  # Keep between -1 and 1
                
                mock_data.append({
                    'atTime': time_point.isoformat(),
                    'mention': random.randint(50, 200),  # Random number of mentions
                    'positiveScore': max(0, sentiment_score),
                    'negativeScore': abs(min(0, sentiment_score)),
                    'positiveMention': random.randint(20, 100),
                    'negativeMention': random.randint(20, 100),
                    'score': sentiment_score
                })
            
            response = JsonResponse({
                'data': mock_data,
                'symbol': symbol,
                'is_mock': True  # Flag to indicate this is mock data
            })
        else:
            response = JsonResponse({
                'data': all_data[:24],  # Last 24 data points
                'symbol': symbol,
                'is_mock': False
            })
            
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    except Exception as e:
        logger.error(f"Error fetching social sentiment for {symbol}: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Failed to fetch social sentiment: {str(e)}'}, status=500)

@api_view(['GET'])
def get_market_impact(request, symbol):
    """
    Get market impact data including stock candles for short-term analysis
    """
    try:
        if not settings.FINNHUB_API_KEY:
            logger.error("FINNHUB_API_KEY not found in settings")
            response = JsonResponse({
                'error': 'Finnhub API key not configured. Please check your environment variables.'
            }, status=500)
            response["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        # Define the time range (last trading day intraday)
        to_time = int(datetime.now().timestamp())
        from_time = to_time - (24 * 60 * 60)  # 24 hours ago

        logger.info(f"Fetching stock candle data for {symbol} from {from_time} to {to_time}")
        logger.info(f"Using Finnhub API key: {settings.FINNHUB_API_KEY[:5]}...")

        # Get stock candle data from Finnhub
        try:
            candle_data = finnhub_client.stock_candles(
                symbol=symbol,
                resolution='1',  # 1-minute resolution
                _from=from_time,
                to=to_time
            )
            logger.info(f"Raw Finnhub response for {symbol}: {candle_data}")
        except Exception as api_error:
            logger.error(f"Finnhub API error for {symbol}: {str(api_error)}")
            response = JsonResponse({
                'error': f'Error calling Finnhub API: {str(api_error)}'
            }, status=500)
            response["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        if candle_data.get('s') != 'ok' or not candle_data.get('h'):
            error_msg = 'No data available'
            if candle_data.get('s') == 'no_data':
                error_msg = f'No data available for {symbol}. This could be because the market is closed or the symbol is invalid.'
            elif 'error' in candle_data:
                error_msg = candle_data['error']
            
            logger.error(f"Failed to fetch stock candle data for {symbol}: {error_msg}")
            response = JsonResponse({
                'error': error_msg
            }, status=400)
            response["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        # Calculate metrics
        high_price = max(candle_data['h'])
        low_price = min(candle_data['l'])
        total_volume = sum(candle_data['v'])
        spread_percent = ((high_price - low_price) / low_price) * 100

        # Format response
        response_data = {
            'intraday_range': {
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'spread_percent': round(spread_percent, 1)
            },
            'volume': {
                'total': f"{total_volume / 1_000:.0f}",  # Convert to millions
                'unit': 'K'
            },
            'time_range': {
                'from': datetime.fromtimestamp(from_time).isoformat(),
                'to': datetime.fromtimestamp(to_time).isoformat()
            },
            'candles': {
                'timestamps': candle_data['t'],
                'high': candle_data['h'],
                'low': candle_data['l'],
                'open': candle_data['o'],
                'close': candle_data['c'],
                'volume': candle_data['v']
            }
        }

        response = JsonResponse(response_data)
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    except Exception as e:
        logger.error(f"Error fetching market impact data for {symbol}: {str(e)}")
        response = JsonResponse({
            'error': f'Internal server error while fetching data for {symbol}: {str(e)}'
        }, status=500)
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

@api_view(['GET'])
def test_market_impact(request):
    """
    Test endpoint to verify market impact functionality
    """
    try:
        symbol = "IBM"  # Test with IBM
        to_time = int(datetime.now().timestamp())
        from_time = to_time - (24 * 60 * 60)  # 24 hours ago

        # Get stock candle data from Finnhub
        candle_data = finnhub_client.stock_candles(
            symbol=symbol,
            resolution='1',  # 1-minute resolution
            _from=from_time,
            to=to_time
        )

        if candle_data['s'] != 'ok':
            return Response({
                'error': 'Failed to fetch stock candle data'
            }, status=400)

        # Calculate metrics
        high_price = max(candle_data['h'])
        low_price = min(candle_data['l'])
        total_volume = sum(candle_data['v'])
        spread_percent = ((high_price - low_price) / low_price) * 100

        # Format response
        response_data = {
            'intraday_range': {
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'spread_percent': round(spread_percent, 1)
            },
            'volume': {
                'total': round(total_volume / 1_000_000, 1),  # Convert to millions
                'unit': 'M'
            },
            'time_range': {
                'from': datetime.fromtimestamp(from_time).isoformat(),
                'to': datetime.fromtimestamp(to_time).isoformat()
            }
        }

        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in test market impact: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=500)

@api_view(['GET'])
def get_earnings_call_summary(request, symbol, call_id):
    """Generate a summary of an earnings call using GPT-3.5-turbo-16k"""
    try:
        # Get OpenAI API key from settings
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            logger.error("OpenAI API key not found in settings")
            return JsonResponse({
                'success': False,
                'error': 'OpenAI API key not configured'
            }, status=500)
        
        logger.info(f"Using OpenAI API key: {api_key[:10]}...")
        
        # Get the transcript file path
        transcript_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'transcripts'
        transcript_file = transcript_dir / f"{call_id}.json"
        
        logger.info(f"Looking for transcript file at: {transcript_file}")
        
        if not transcript_file.exists():
            logger.error(f"Transcript file not found at: {transcript_file}")
            return JsonResponse({
                'success': False,
                'error': f'No transcript found for {symbol} call {call_id}'
            }, status=404)
        
        # Read and process the transcript
        try:
            with open(transcript_file, 'r') as f:
                transcript_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from transcript file: {e}")
            return JsonResponse({
                'success': False,
                'error': f'Invalid transcript file format: {str(e)}'
            }, status=500)
        except Exception as e:
            logger.error(f"Error reading transcript file: {e}")
            return JsonResponse({
                'success': False,
                'error': f'Error reading transcript file: {str(e)}'
            }, status=500)
        
        # Extract the relevant parts of the transcript
        try:
            transcript_text = ""
            for entry in transcript_data.get('transcript', []):
                speaker = entry.get('name', '')
                for speech in entry.get('speech', []):
                    transcript_text += f"{speaker}: {speech}\n\n"
            
            if not transcript_text.strip():
                logger.error("Empty transcript text generated")
                return JsonResponse({
                    'success': False,
                    'error': 'Empty transcript text'
                }, status=500)
            
            logger.info(f"Generated transcript text of length: {len(transcript_text)}")
        except Exception as e:
            logger.error(f"Error processing transcript data: {e}")
            return JsonResponse({
                'success': False,
                'error': f'Error processing transcript: {str(e)}'
            }, status=500)
        
        # Generate summary using GPT-3.5-turbo-16k
        try:
            # Initialize OpenAI client
            client = OpenAI(api_key=api_key)
            
            logger.info("Making request to OpenAI API...")
            response = client.chat.completions.create(
                model="gpt-3.5-turbo-16k",  # Using GPT-3.5-turbo-16k for longer context
                messages=[
                    {"role": "system", "content": "You are a financial analyst assistant. Summarize the key points from this earnings call transcript, focusing on financial performance, future guidance, and important announcements. Be concise but comprehensive."},
                    {"role": "user", "content": transcript_text}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            if not response or not response.choices:
                logger.error("Empty response from OpenAI API")
                return JsonResponse({
                    'success': False,
                    'error': 'Empty response from OpenAI API'
                }, status=500)
            
            summary = response.choices[0].message.content
            if not summary:
                logger.error("Empty summary received from OpenAI API")
                return JsonResponse({
                    'success': False,
                    'error': 'Empty summary received from OpenAI API'
                }, status=500)
            
            logger.info(f"Successfully generated summary of length: {len(summary)}")
            
            # Cache the summary
            cache_key = f"earnings_summary_{symbol}_{call_id}"
            cache.set(cache_key, summary, 60 * 60 * 24)  # Cache for 24 hours
            
            return JsonResponse({
                'success': True,
                'summary': summary
            })
            
        except Exception as api_error:
            logger.error(f"OpenAI API error: {str(api_error)}")
            return JsonResponse({
                'success': False,
                'error': f'Error generating summary: {str(api_error)}'
            }, status=500)
        
    except Exception as e:
        logger.error(f"Error generating summary for {symbol} call {call_id}: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
def get_medium_term_impact(request, symbol):
    """Get medium-term market impact data including analyst ratings and sector comparison."""
    try:
        # Get analyst ratings
        params = {"symbol": symbol, "token": settings.FINNHUB_API_KEY}
        recommendation_url = "https://finnhub.io/api/v1/stock/recommendation"
        price_target_url = "https://finnhub.io/api/v1/stock/price-target"
        
        # Fetch analyst recommendations
        rec_response = session.get(recommendation_url, params=params)
        if not rec_response.ok:
            return Response({'error': 'Failed to fetch analyst recommendations'}, status=400)
        
        ratings_data = rec_response.json()
        if not ratings_data:
            return Response({'error': 'No analyst ratings available'}, status=404)
            
        latest_ratings = ratings_data[0]  # Most recent ratings
        
        # Fetch price target
        pt_response = session.get(price_target_url, params=params)
        if not pt_response.ok:
            return Response({'error': 'Failed to fetch price target'}, status=400)
            
        price_target_data = pt_response.json()
        
        # Get sector comparison data
        peers_url = "https://finnhub.io/api/v1/stock/peers"
        peers_response = session.get(peers_url, params=params)
        if not peers_response.ok:
            return Response({'error': 'Failed to fetch peer companies'}, status=400)
            
        peers = peers_response.json()
        
        # Get performance data for peers
        peer_performance = {}
        for peer in peers:
            quote_params = {"symbol": peer, "token": settings.FINNHUB_API_KEY}
            quote_response = session.get("https://finnhub.io/api/v1/quote", params=quote_params)
            if quote_response.ok:
                quote_data = quote_response.json()
                # Get percentage change and current price
                peer_performance[peer] = {
                    'change_percent': quote_data.get('dp', 0),  # dp is percentage change
                    'current_price': quote_data.get('c', 0),  # c is current price
                    'change': quote_data.get('d', 0)  # d is price change
                }
                
        # Calculate sector metrics
        valid_performances = [p['change_percent'] for p in peer_performance.values() if p['change_percent'] is not None]
        sector_avg_performance = sum(valid_performances) / len(valid_performances) if valid_performances else 0
        
        # Get the stock's performance
        stock_performance = peer_performance.get(symbol, {'change_percent': 0})['change_percent']
        relative_performance = stock_performance - sector_avg_performance
        
        # Calculate sector rank
        sorted_peers = sorted(
            [(p, data['change_percent']) for p, data in peer_performance.items()],
            key=lambda x: x[1],
            reverse=True
        )
        sector_rank = next((i + 1 for i, (peer, _) in enumerate(sorted_peers) if peer == symbol), len(sorted_peers))
        
        # Get beta value
        metric_params = {"symbol": symbol, "metric": "all", "token": settings.FINNHUB_API_KEY}
        metric_response = session.get("https://finnhub.io/api/v1/stock/metric", params=metric_params)
        beta = metric_response.json().get('metric', {}).get('beta', None) if metric_response.ok else None
        
        response_data = {
            'analyst_ratings': {
                'buy': latest_ratings.get('buy', 0),
                'hold': latest_ratings.get('hold', 0),
                'sell': latest_ratings.get('sell', 0),
                'price_target': price_target_data.get('targetMean'),
                'price_target_high': price_target_data.get('targetHigh'),
                'price_target_low': price_target_data.get('targetLow'),
            },
            'sector_comparison': {
                'peer_companies': peers,
                'relative_performance': relative_performance,
                'sector_avg_performance': sector_avg_performance,
                'stock_performance': stock_performance,
                'sector_rank': sector_rank,
                'total_peers': len(peers),
                'beta': beta,
                'peer_performance': peer_performance
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in get_medium_term_impact: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_long_term_impact(request, symbol):
    """Get long-term market impact data including EPS and revenue estimates."""
    try:
        # Get EPS estimates
        eps_url = "https://finnhub.io/api/v1/stock/eps-estimate"
        params = {
            "symbol": symbol,
            "freq": "quarterly",
            "token": settings.FINNHUB_API_KEY
        }
        
        eps_response = session.get(eps_url, params=params)
        if not eps_response.ok:
            return Response({'error': 'Failed to fetch EPS estimates'}, status=400)
            
        eps_data = eps_response.json()
        
        # Get revenue estimates
        revenue_url = "https://finnhub.io/api/v1/stock/revenue-estimate"
        revenue_response = session.get(revenue_url, params=params)
        if not revenue_response.ok:
            return Response({'error': 'Failed to fetch revenue estimates'}, status=400)
            
        revenue_data = revenue_response.json()
        
        # Process the data
        if "data" not in eps_data or "data" not in revenue_data:
            return Response({'error': 'No estimate data available'}, status=404)
            
        # Find the latest year
        latest_year = max(item["year"] for item in eps_data["data"])
        
        # Initialize quarters data
        quarters_data = []
        for q in range(1, 5):  # Q1 to Q4
            quarter_data = {
                "quarter": f"Q{q}",
                "eps": None,
                "revenue": None
            }
            
            # Find EPS data for this quarter
            eps_item = next(
                (item for item in eps_data["data"] 
                 if item["year"] == latest_year and item["quarter"] == q),
                None
            )
            if eps_item:
                quarter_data["eps"] = eps_item["epsAvg"]
                
            # Find revenue data for this quarter
            revenue_item = next(
                (item for item in revenue_data["data"]
                 if item["year"] == latest_year and item["quarter"] == q),
                None
            )
            if revenue_item:
                quarter_data["revenue"] = revenue_item["revenueAvg"]
                
            quarters_data.append(quarter_data)
        
        response_data = {
            'year': latest_year,
            'quarters': quarters_data
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error in get_long_term_impact: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def news_sentiment(request):
    symbol = request.GET.get('symbol')
    if not symbol:
        return JsonResponse({'error': 'Symbol is required'}, status=400)

    try:
        logger.info(f"Fetching news sentiment for symbol: {symbol}")
        
        if not settings.FINNHUB_API_KEY:
            logger.error("FINNHUB_API_KEY not found in settings")
            return JsonResponse({'error': 'Finnhub API key not configured'}, status=500)
            
        logger.info(f"Using Finnhub API key: {settings.FINNHUB_API_KEY[:10]}...")
        
        # Get news sentiment data from Finnhub
        sentiment = finnhub_client.news_sentiment(symbol)
        logger.info(f"Raw Finnhub response: {sentiment}")
        
        # Process and format the data
        response_data = {
            'articlesInLastWeek': sentiment.get('buzz', {}).get('articlesInLastWeek', 0),
            'companyNewsScore': sentiment.get('companyNewsScore', 0),
            'bearishPercent': sentiment.get('sentiment', {}).get('bearishPercent', 0),
            'bullishPercent': sentiment.get('sentiment', {}).get('bullishPercent', 0)
        }
        
        response = JsonResponse(response_data)
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        logger.error(f"Error fetching news sentiment for {symbol}: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Failed to fetch news sentiment: {str(e)}'}, status=500)

def preprocess_transcript(executives, qa_section):
    """Process Q&A section of transcript into a structured format."""
    processed_qa = []
    current_question = None
    
    for item in qa_section:
        name = item['name']
        is_executive = name in executives
        
        for speech in item['speech']:
            if not is_executive:  # This is an analyst asking a question
                current_question = {
                    'analyst': name,
                    'question': speech,
                    'responses': []
                }
                processed_qa.append(current_question)
            else:  # This is an executive responding
                if current_question:
                    current_question['responses'].append({
                        'executive': name,
                        'response': speech
                    })
    
    return processed_qa

@api_view(['GET'])
def qa_analysis(request, symbol, call_id):
    """Analyze Q&A section of an earnings call transcript"""
    try:
        if not settings.FINNHUB_API_KEY:
            logger.error("FINNHUB_API_KEY not found in settings")
            return JsonResponse({'error': 'Finnhub API key not configured'}, status=500)

        # Get transcript from Finnhub
        transcript = finnhub_client.transcripts(call_id)
        if not transcript:
            return JsonResponse({'error': 'Transcript not found'}, status=404)

        # Get executives list
        executives = [d['name'] for d in transcript.get('participant', []) if d.get('role') == 'executive']
        
        # Get Q&A section
        qa_section = [
            {'name': d['name'], 'speech': d['speech']} 
            for d in transcript.get('transcript', []) 
            if d.get('session') == 'question_answer'
        ]

        if not qa_section:
            logger.warning(f"No Q&A section found in transcript {call_id}")
            return JsonResponse({
                'response_quality': 0,
                'questions_addressed': 0,
                'follow_up_questions': 0
            })

        # Process transcript
        processed_transcript = preprocess_transcript(executives, qa_section)
        
        if not processed_transcript:
            logger.warning(f"No processed Q&A data for transcript {call_id}")
            return JsonResponse({
                'response_quality': 0,
                'questions_addressed': 0,
                'follow_up_questions': 0
            })

        # Create the prompt template
        prompt = ChatPromptTemplate.from_template(
            """
            You are an AI assistant evaluating a transcript from an earnings call Q&A session.
            The transcript is structured as a sequence of questions and answers.
            
            Transcript:
            {processed_transcript}
            
            Analyze this transcript and provide:
            1. Response Quality: A percentage score (0-100%) indicating how well the responses addressed the questions
            2. Questions Addressed: Number of unique questions that received substantive answers
            3. Follow-up Questions: Number of follow-up questions asked by analysts
            
            Be precise in your counting:
            - A question is any interrogative statement from an analyst
            - A follow-up question is explicitly mentioned as a follow-up or asked after an initial question by the same person
            - Count questions that weren't fully addressed or were deflected in your assessment
            
            Return your analysis in this JSON format:
            {{
                "response_quality": <percentage>,
                "questions_addressed": <number>,
                "follow_up_questions": <number>
            }}
            """
        )

        # Create and run the chain
        chain = prompt | llm | parser
        
        # Process the transcript
        try:
            analysis = chain.invoke({
                "processed_transcript": json.dumps(processed_transcript, indent=2)
            })
            
            # Ensure the values are in the correct range
            analysis['response_quality'] = max(0, min(100, analysis.get('response_quality', 0)))
            analysis['questions_addressed'] = max(0, analysis.get('questions_addressed', 0))
            analysis['follow_up_questions'] = max(0, analysis.get('follow_up_questions', 0))
            
            logger.info(f"Successfully analyzed Q&A for transcript {call_id}")
            response = JsonResponse(analysis)
            response["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response
            
        except Exception as e:
            logger.error(f"Error in LLM analysis: {str(e)}")
            response = JsonResponse({
                'response_quality': 0,
                'questions_addressed': 0,
                'follow_up_questions': 0
            })
            response["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

    except Exception as e:
        logger.error(f"Error analyzing Q&A for {symbol} call {call_id}: {str(e)}", exc_info=True)
        response = JsonResponse({'error': f'Failed to analyze Q&A: {str(e)}'}, status=500)
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

def format_currency(value):
    """Format numerical values as currency (T, B, M, K)."""
    if value is None:
        return "N/A"

    try:
        value = float(value)
    except (ValueError, TypeError):
        return "N/A"

    if abs(value) >= 1_000_000_000_000:
        return f"${value / 1_000_000_000_000:.1f}T"
    elif abs(value) >= 1_000_000_000:
        return f"${value / 1_000_000_000:.1f}B"
    elif abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif abs(value) >= 1_000:
        return f"${value / 1_000:.1f}K"
    return f"${value:.2f}"

def calculate_eps_vs_expected(eps_actual, eps_estimate):
    """Calculate the EPS difference compared to expected."""
    if eps_actual is not None and eps_estimate is not None:
        try:
            eps_actual = float(eps_actual)
            eps_estimate = float(eps_estimate)
            eps_percent_diff = ((eps_actual - eps_estimate) / abs(eps_estimate)) * 100
            direction = "↑" if eps_percent_diff >= 0 else "↓"
            return f"{direction} {abs(round(eps_percent_diff, 1))}% vs Expected"
        except (ValueError, ZeroDivisionError):
            return "N/A"
    return "N/A"

def calculate_revenue_yoy(current_revenue, previous_revenue):
    """Calculate Year-over-Year (YoY) revenue change."""
    if current_revenue is not None and previous_revenue is not None:
        try:
            current_revenue = float(current_revenue)
            previous_revenue = float(previous_revenue)
            revenue_percent_change = ((current_revenue - previous_revenue) / abs(previous_revenue)) * 100
            direction = "↑" if revenue_percent_change >= 0 else "↓"
            return f"{direction} {abs(round(revenue_percent_change, 1))}% YoY"
        except (ValueError, ZeroDivisionError):
            return "N/A"
    return "N/A"

def calculate_cash_flow_qoq(current_cf, previous_cf):
    """Calculate Quarter-over-Quarter (QoQ) cash flow change."""
    if current_cf is not None and previous_cf is not None:
        try:
            current_cf = float(current_cf)
            previous_cf = float(previous_cf)
            cf_percent_change = ((current_cf - previous_cf) / abs(previous_cf)) * 100
            direction = "↑" if cf_percent_change >= 0 else "↓"
            return f"{direction} {abs(round(cf_percent_change, 1))}% QoQ"
        except (ValueError, ZeroDivisionError):
            return "N/A"
    return "N/A"

@api_view(['GET'])
def get_financial_metrics(request, symbol):
    """Fetch financial metrics for a given company symbol."""
    try:
        # Get basic financials
        basic_financials = finnhub_client.company_basic_financials(symbol, 'all')
        
        # Get company metrics
        metrics = basic_financials.get('metric', {})
        
        # Get earnings data for the last two quarters
        earnings_data = []
        today = date.today()
        from_date = (today - timedelta(days=180)).strftime('%Y-%m-%d')
        to_date = today.strftime('%Y-%m-%d')
        
        try:
            earnings = fetch_earnings(from_date, to_date, symbol)
            earnings_data = sorted(earnings, key=lambda x: x['date'], reverse=True)[:2]
        except Exception as e:
            logger.error(f"Error fetching earnings data: {str(e)}")
            earnings_data = []

        # Format the response
        response = {
            'symbol': symbol,
            'financials': {
                'EPS': {
                    'actual': format_currency(earnings_data[0].get('epsActual') if earnings_data else None),
                    'estimate': format_currency(earnings_data[0].get('epsEstimate') if earnings_data else None),
                    'change': calculate_eps_vs_expected(
                        earnings_data[0].get('epsActual') if earnings_data else None,
                        earnings_data[0].get('epsEstimate') if earnings_data else None
                    ) if earnings_data else 'N/A'
                },
                'Revenue': {
                    'actual': format_currency(metrics.get('revenuePerShare') * metrics.get('marketCapitalization', 0) if metrics.get('revenuePerShare') else None),
                    'estimate': format_currency(earnings_data[0].get('revenueEstimate') if earnings_data else None),
                    'change': calculate_revenue_yoy(
                        metrics.get('revenuePerShare') * metrics.get('marketCapitalization', 0) if metrics.get('revenuePerShare') else None,
                        metrics.get('revenuePerShareTTM', 0) * metrics.get('marketCapitalization', 0) if metrics.get('revenuePerShareTTM') else None
                    )
                },
                'Cash Flow': {
                    'actual': format_currency(metrics.get('freeCashFlowPerShare') * metrics.get('marketCapitalization', 0) if metrics.get('freeCashFlowPerShare') else None),
                    'change': calculate_cash_flow_qoq(
                        metrics.get('freeCashFlowPerShare') * metrics.get('marketCapitalization', 0) if metrics.get('freeCashFlowPerShare') else None,
                        metrics.get('freeCashFlowTTM', 0) * metrics.get('marketCapitalization', 0) if metrics.get('freeCashFlowTTM') else None
                    )
                }
            }
        }

        return JsonResponse(response)

    except Exception as e:
        logger.error(f"Error fetching financial metrics for {symbol}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def earnings_call_sentiment(request):
    symbol = request.GET.get('symbol')
    status = request.GET.get('status', 'past')  # 'present' or 'past'
    
    if not symbol:
        return JsonResponse({'error': 'Symbol is required'}, status=400)

    try:
        analyzer = EarningsCallAnalyzer()
        analysis = analyzer.analyze_text(symbol, status)
        
        if 'error' in analysis:
            return JsonResponse({'error': analysis['error']}, status=500)
            
        response = JsonResponse({
            'data': {
                'sentiment': analysis.get('sentiment', 'Neutral'),
                'positive_keywords_count': analysis.get('positive_keywords_count', 0),
                'negative_keywords_count': analysis.get('negative_keywords_count', 0),
                'hesitation_markers_count': analysis.get('hesitation_markers_count', 0)
            },
            'symbol': symbol,
            'is_mock': False
        })
        
        response["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing earnings call sentiment for {symbol}: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Failed to analyze earnings call sentiment: {str(e)}'}, status=500)