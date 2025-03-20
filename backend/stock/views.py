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
from langchain.prompts import ChatPromptTemplate
from .llm_service import llm_call
from langchain.schema import BaseOutputParser
from .earnings_analyzer import EarningsCallAnalyzer
import glob
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from .chat_service import ChatService
import yfinance as yf

# Set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Set up LLM
llm = llm_call()
chat_model = llm
    

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

# Constants for RAG
QUESTIONS = [
    "What are the primary financial highlights from the filing?",
    "Which business segments, products, or services are most influential?",
    "What key regional or market trends are observed?",
    "What operational achievements or challenges are highlighted?",
    "How have expenses and cost structures changed over the period?",
    "What significant risks or uncertainties are identified?",
    "Which strategic initiatives or investments are noted?",
    "How is the company's competitive position and market landscape described?",
    "What trends in efficiency or productivity are reported?",
    "What forward-looking guidance or growth outlook does management provide?"
]

TEMPERATURE = 0
CHUNK_SIZE = 1000
OVERLAP_SIZE = 200
OPENAI_MODEL = "gpt-3.5-turbo"
INDEX_DIR = "vector_dbs"
PDF_DIR = "data"  # Relative to project root

chat_service = ChatService()

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
        transcript_dir = Path(settings.MEDIA_ROOT) / symbol / 'transcripts'
        audio_dir = Path(settings.MEDIA_ROOT) / symbol / 'audios'
        
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
            try:
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
                    'audioUrl': audio_url if audio_exists else None,
                    'audioAvailable': audio_exists
                })
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON from {transcript_file}: {e}")
                continue
            except Exception as e:
                print(f"Error processing file {transcript_file}: {e}")
                continue
        
        if not audio_history:
            print(f"No audio history found for {symbol}")
            return JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
        
        audio_history.sort(key=lambda x: x.get('time', ''), reverse=True)
        print(f"Returning audio history for {symbol}: {audio_history}")
        
        response = JsonResponse({
            'success': True,
            'audioHistory': audio_history
        })
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        print(f"Error in get_audio_history: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def get_company_transcripts(request, symbol):
    try:
        use_redis = bool(os.getenv('USE_REDIS', 'False') == 'True')
        cached_transcripts = None
        
        if use_redis:
            try:
                # Initialize Redis client
                redis_client = redis.Redis(
                    host=os.getenv('REDIS_HOST', 'localhost'),
                    port=int(os.getenv('REDIS_PORT', 6379)),
                    db=0,
                    decode_responses=True,
                    socket_timeout=2,
                    socket_connect_timeout=2
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
                        response = JsonResponse({
                            'success': True,
                            'transcripts': json.loads(cached_transcripts)
                        })
                        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
                        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
                        response["Access-Control-Allow-Headers"] = "Content-Type"
                        return response
            except Exception as redis_error:
                logger.error(f"Redis error: {redis_error}")
                # Continue without Redis
                pass
        
        # If not in cache or Redis failed, get from filesystem
        base_dir = Path(settings.MEDIA_ROOT) / symbol / 'transcripts'
        logger.info(f"Looking for transcripts in: {base_dir}")
        
        if not base_dir.exists():
            logger.warning(f"Directory not found: {base_dir}")
            response = JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response
        
        # Get all transcript files for the company
        transcript_files = sorted(
            [f for f in base_dir.glob('*.json')],
            reverse=True  # Most recent first
        )
        logger.info(f"Found transcript files: {transcript_files}")
        
        transcripts = []
        for file_path in transcript_files:
            try:
                with open(file_path, 'r') as f:
                    transcript_data = json.load(f)
                    transcripts.append(transcript_data)
            except json.JSONDecodeError as e:
                logger.error(f"Error reading file {file_path}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {str(e)}")
                continue
        
        if not transcripts:
            response = JsonResponse({
                'success': False,
                'error': 'No valid transcripts found'
            }, status=404)
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response
        
        # Cache the transcripts in Redis if available
        if use_redis and redis_client:
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
        
        response = JsonResponse({
            'success': True,
            'transcripts': transcripts
        })
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        logger.error(f"Error in get_company_transcripts: {str(e)}")
        response = JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

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
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
        relative_path = audio_url.replace('https://backend-production-2463.up.railway.app', '')
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
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
        
        # Check if we have data in the response
        if not sentiment or (not sentiment.get('data', []) and not sentiment.get('reddit', []) and not sentiment.get('twitter', [])):
            logger.warning(f"No sentiment data available for {symbol}")
            return JsonResponse({
                'error': f'No social sentiment data available for {symbol}',
                'symbol': symbol
            }, status=404)

        # Process and format the data
        all_data = []
        
        # If data is directly in the response
        if sentiment.get('data'):
            all_data.extend(sentiment['data'])
        else:
            # Process Reddit data
            reddit_data = sentiment.get('reddit', [])
            twitter_data = sentiment.get('twitter', [])
            
            logger.info(f"Reddit data count: {len(reddit_data)}")
            logger.info(f"Twitter data count: {len(twitter_data)}")
            
            # Combine and sort data by time
            for item in reddit_data + twitter_data:
                mention_count = item.get('mention', 0)
                
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
        
        response = JsonResponse({
            'data': all_data[:24],  # Last 24 data points
            'symbol': symbol,
            'is_mock': False
        })
            
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        # Define the time range (last trading day intraday)
        to_time = int(datetime.now().timestamp())
        from_time = to_time - (24 * 60 * 60)  # 24 hours ago

        logger.info(f"Fetching stock candle data for {symbol} from {from_time} to {to_time}")
        logger.info(f"Using Finnhub API key: {settings.FINNHUB_API_KEY[:5]}...")

        # Get stock candle data from Finnhub with hourly resolution
        try:
            candle_data = finnhub_client.stock_candles(
                symbol=symbol,
                resolution='60',  # 1-hour resolution
                _from=from_time,
                to=to_time
            )
            logger.info(f"Raw Finnhub response for {symbol}: {candle_data}")
        except Exception as api_error:
            logger.error(f"Finnhub API error for {symbol}: {str(api_error)}")
            response = JsonResponse({
                'error': f'Error calling Finnhub API: {str(api_error)}'
            }, status=500)
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

        # Calculate metrics
        high_price = max(candle_data['h'])
        low_price = min(candle_data['l'])
        total_volume = sum(candle_data['v'])
        spread_percent = ((high_price - low_price) / low_price) * 100

        # Format candlestick data
        candlestick_data = []
        for i in range(len(candle_data['t'])):
            candlestick_data.append({
                'time': datetime.fromtimestamp(candle_data['t'][i]).strftime('%H:%M'),
                'open': round(candle_data['o'][i], 2),
                'high': round(candle_data['h'][i], 2),
                'low': round(candle_data['l'][i], 2),
                'close': round(candle_data['c'][i], 2),
                'volume': candle_data['v'][i]
            })

        # Format response
        response_data = {
            'intraday_range': {
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'spread_percent': round(spread_percent, 1)
            },
            'volume': {
                'total': f"{total_volume / 1_000:.0f}",  # Convert to thousands
                'unit': 'K'
            },
            'time_range': {
                'from': datetime.fromtimestamp(from_time).isoformat(),
                'to': datetime.fromtimestamp(to_time).isoformat()
            },
            'candlestick_data': candlestick_data
        }

        response = JsonResponse(response_data)
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    except Exception as e:
        logger.error(f"Error fetching market impact data for {symbol}: {str(e)}")
        response = JsonResponse({
            'error': f'Internal server error while fetching data for {symbol}: {str(e)}'
        }, status=500)
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
            response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            return response

    except Exception as e:
        logger.error(f"Error analyzing Q&A for {symbol} call {call_id}: {str(e)}", exc_info=True)
        response = JsonResponse({'error': f'Failed to analyze Q&A: {str(e)}'}, status=500)
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
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
        logger.info(f"Raw Finnhub response for {symbol}: {basic_financials}")
        
        # Get company metrics
        metrics = basic_financials.get('metric', {})
        logger.info(f"Extracted metrics for {symbol}: {metrics}")
        
        # Calculate the date ranges for latest and previous quarters
        today = date.today()
        current_quarter = (today.month - 1) // 3 + 1
        current_year = today.year
        
        logger.info(f"Current quarter: {current_quarter}, Current year: {current_year}")
        
        # Calculate the start of the current quarter
        current_quarter_start = date(current_year, 3 * current_quarter - 2, 1)
        
        # Calculate the end of the current quarter
        if current_quarter == 4:
            current_quarter_end = date(current_year, 12, 31)
        else:
            current_quarter_end = date(current_year, 3 * current_quarter, 1) + timedelta(days=32)
            current_quarter_end = current_quarter_end.replace(day=1) - timedelta(days=1)
        
        # Calculate previous quarter dates
        if current_quarter == 1:
            previous_quarter_start = date(current_year - 1, 10, 1)
            previous_quarter_end = date(current_year - 1, 12, 31)
        else:
            previous_quarter_start = date(current_year, 3 * (current_quarter - 1) - 2, 1)
            previous_quarter_end = date(current_year, 3 * (current_quarter - 1), 1) + timedelta(days=32)
            previous_quarter_end = previous_quarter_end.replace(day=1) - timedelta(days=1)
        
        # Get earnings data for both quarters
        current_quarter_earnings = fetch_earnings(
            current_quarter_start.strftime('%Y-%m-%d'),
            current_quarter_end.strftime('%Y-%m-%d'),
            symbol
        )
        logger.info(f"Current quarter earnings data: {current_quarter_earnings}")
        
        previous_quarter_earnings = fetch_earnings(
            previous_quarter_start.strftime('%Y-%m-%d'),
            previous_quarter_end.strftime('%Y-%m-%d'),
            symbol
        )
        logger.info(f"Previous quarter earnings data: {previous_quarter_earnings}")
        
        # Combine and sort earnings data
        all_earnings = sorted(
            current_quarter_earnings + previous_quarter_earnings,
            key=lambda x: x.get('date', ''),
            reverse=True
        )
        logger.info(f"Combined earnings data: {all_earnings}")

        # Get revenue from earnings data
        current_revenue = all_earnings[0].get('revenueActual') if all_earnings else None
        previous_revenue = all_earnings[1].get('revenueActual') if len(all_earnings) > 1 else None
            
        # Get cash flow data
        cash_flow = metrics.get('cashFlowPerShareAnnual')  # Use cashFlowPerShareAnnual
        if cash_flow is not None:
            # Convert from per share to total cash flow using market cap
            market_cap = metrics.get('marketCapitalization', 0)
            shares_outstanding = market_cap / (metrics.get('currentRatioAnnual', 1) or 1)  # Estimate shares outstanding
            cash_flow = cash_flow * shares_outstanding

        prev_cash_flow = metrics.get('cashFlowPerShareTTM')  # Use cashFlowPerShareTTM
        if prev_cash_flow is not None:
            # Convert from per share to total cash flow using market cap
            market_cap = metrics.get('marketCapitalization', 0)
            shares_outstanding = market_cap / (metrics.get('currentRatioAnnual', 1) or 1)  # Estimate shares outstanding
            prev_cash_flow = prev_cash_flow * shares_outstanding

        logger.info(f"Revenue values - Current: {current_revenue}, Previous: {previous_revenue}")
        logger.info(f"Cash Flow values - Current: {cash_flow}, Previous: {prev_cash_flow}")

        # Format the response
        response = {
            'symbol': symbol,
            'financials': {
                'EPS': {
                    'actual': format_currency(all_earnings[0].get('epsActual') if all_earnings else None),
                    'estimate': format_currency(all_earnings[0].get('epsEstimate') if all_earnings else None),
                    'change': calculate_eps_vs_expected(
                        all_earnings[0].get('epsActual') if all_earnings else None,
                        all_earnings[0].get('epsEstimate') if all_earnings else None
                    ) if all_earnings else 'N/A'
                },
                'Revenue': {
                    'actual': format_currency(current_revenue),
                    'estimate': format_currency(all_earnings[0].get('revenueEstimate') if all_earnings else None),
                    'change': calculate_revenue_yoy(current_revenue, previous_revenue)  # Use revenue_yoy for revenue
                },
                'Cash Flow': {
                    'actual': format_currency(cash_flow),
                    'change': calculate_cash_flow_qoq(cash_flow, prev_cash_flow)  # Use cash_flow_qoq for cash flow
                }
            }
        }
        
        logger.info(f"Final formatted response: {response}")
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
        analyzer = EarningsCallAnalyzer(llm)
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
        
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing earnings call sentiment for {symbol}: {str(e)}", exc_info=True)
        return JsonResponse({'error': f'Failed to analyze earnings call sentiment: {str(e)}'}, status=500)

def find_pdf_file(symbol):
    """Find the correct PDF file matching the stock symbol."""
    symbol = symbol.upper()
    base_dir = Path(__file__).resolve().parent.parent
    pdf_pattern = os.path.join(base_dir, PDF_DIR, symbol, "sec_filing", f"{symbol}.pdf")
    matching_files = glob.glob(pdf_pattern)
    if matching_files:
        return matching_files[0]
    else:
        raise FileNotFoundError(f"File not found for symbol: {symbol}. Make sure file exists.")

def create_faiss_index(symbol):
    """Creates a FAISS index for a given stock symbol's financial filing PDF."""
    try:
        pdf_path = find_pdf_file(symbol)
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=OVERLAP_SIZE)
        chunks = text_splitter.split_documents(documents)

        logger.info(f"Creating FAISS index for {symbol}...")
        embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        vectorstore = FAISS.from_documents(chunks, embeddings)

        base_dir = Path(__file__).resolve().parent.parent
        index_file = os.path.join(base_dir, INDEX_DIR, f"{symbol}_faiss.index")
        os.makedirs(os.path.join(base_dir, INDEX_DIR), exist_ok=True)
        vectorstore.save_local(index_file)

        return vectorstore
    except Exception as e:
        logger.error(f"Error creating FAISS index for {symbol}: {e}")
        raise

def load_faiss_index(symbol):
    """Loads an existing FAISS index if available."""
    base_dir = Path(__file__).resolve().parent.parent
    index_dir = os.path.join(base_dir, INDEX_DIR, f"{symbol}_faiss.index")

    if os.path.exists(os.path.join(index_dir, "index.faiss")) and os.path.exists(os.path.join(index_dir, "index.pkl")):
        logger.info(f"Loading FAISS index for {symbol} from {index_dir}...")
        return FAISS.load_local(
            index_dir,
            OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY),
            allow_dangerous_deserialization=True
        )

    logger.warning(f"FAISS index for {symbol} not found at {index_dir}.")
    return None

def search_faiss(index, query):
    """Retrieves relevant document chunks from FAISS index."""
    retriever_chain = index.as_retriever()
    return retriever_chain.invoke(query)

def generate_response(context, question):
    """Generates response using GPT model."""
    MESSAGES = [
        {
            "role": "system", "content": """
            You are a financial expert for SEC 10K/10Q filings.
            Answer in a single crisp line (under 20 words) with key stats using semicolons. 
            If context lacks the answer, reply: 'I cannot answer this question based on the provided context.'

            **Examples:**
            {
            "question": "What are the major changes in revenue for 2024?"
            "answer": "Revenue up 5% YoY to $10.2B; North America strong."
            },
            {
            "question": "What risks were highlighted?"
            "answer": "Regulatory, trade, cybersecurity risks; growth targets unmet."
            }
            """
        },
        {"role": "user", "content": f"Context: {context}\nQuestion: {question}"}
    ]
    return chat_model.invoke(MESSAGES).content

@api_view(['GET'])
def get_key_highlights(request):
    """Get key highlights from SEC filings using RAG."""
    symbol = request.GET.get('symbol')
    if not symbol:
        return JsonResponse({'error': 'Symbol is required'}, status=400)

    try:
        logger.info(f"Fetching key highlights for symbol: {symbol}")
        
        # Load or create FAISS index
        index = load_faiss_index(symbol)
        if index is None:
            logger.info(f"No FAISS index found for {symbol}, creating new index...")
            index = create_faiss_index(symbol)

        # Get responses for each question
        responses = []
        for question in QUESTIONS:
            try:
                context = search_faiss(index, question)
                answer = generate_response(context, question)
                if answer and not answer.startswith('I cannot answer'):
                    responses.append(answer)
            except Exception as e:
                logger.error(f"Error processing question '{question}' for {symbol}: {e}")
                continue
        
        if not responses:
            logger.warning(f"No valid highlights found for {symbol}")
            return JsonResponse({
                'responses': [],
                'message': 'No key highlights found for this company'
            })
        
        # Add CORS headers
        response = JsonResponse({
            'responses': responses,
            'message': 'Successfully retrieved key highlights'
        })
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except FileNotFoundError as e:
        logger.error(f"PDF file not found for {symbol}: {e}")
        return JsonResponse({
            'error': f'No SEC filing found for {symbol}'
        }, status=404)
    except Exception as e:
        logger.error(f"Error fetching key highlights for {symbol}: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': f'Failed to fetch key highlights: {str(e)}'
        }, status=500)

@api_view(['POST'])
def chat(request):
    """
    Endpoint for handling both market and company-specific chat messages
    """
    try:
        message = request.data.get('message')
        symbol = request.data.get('symbol')  # None for market queries, symbol for company queries
        
        if not message:
            logger.warning("Chat request received without message")
            return Response({'error': 'Message is required'}, status=400)
            
        logger.info(f"Processing chat request for {'market' if not symbol else symbol}")
        response = chat_service.generate_response(message, symbol)
        
        # Add CORS headers
        response_data = {'response': response}
        response = Response(response_data)
        response["Access-Control-Allow-Origin"] = "https://advisorinsight-production.up.railway.app"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return Response({
            'error': 'An error occurred while processing your request. Please try again later.',
            'detail': str(e) if settings.DEBUG else None
        }, status=500)

@api_view(['GET'])
def get_suggested_questions(request):
    """
    Endpoint for getting suggested questions for market or company
    """
    try:
        symbol = request.query_params.get('symbol')  # None for market questions
        questions = chat_service.get_suggested_questions(symbol)
        return Response({'questions': questions})
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_indices_data(request):
    try:
        # US indices
        us_indices = ['^DJI', '^GSPC', '^IXIC']  # Dow Jones, S&P 500, NASDAQ
        # Global indices
        global_indices = ['^FTSE', '^N225']  # FTSE 100, Nikkei 225
        # Sector ETFs
        sectors = {
            "XLK": "Technology",
            "XLV": "Healthcare", 
            "XLF": "Financials",
            "XLE": "Energy",
            "XLI": "Industrials",
            "XLC": "Communication"
        }
        
        # Top 100 S&P 500 tickers for volume and movers
        tickers = [
            "AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "TSLA", "BRK-B", "UNH", "JNJ",
            "XOM", "JPM", "V", "PG", "CVX", "HD", "MA", "LLY", "MRK", "ABBV",
            "PEP", "KO", "BAC", "PFE", "COST", "AVGO", "DIS", "CSCO", "MCD", "WMT",
            "ACN", "DHR", "NEE", "TXN", "LIN", "VZ", "ADBE", "CMCSA", "NFLX", "INTC"
        ]
        
        indices_data = {
            'us': {},
            'global': {},
            'sectors': {},
            'movers': {
                'gainers': [],
                'losers': []
            },
            'volume_leaders': []
        }
        
        # Fetch US indices data...
        for symbol in us_indices:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period='1d', interval='1m')
            if not data.empty:
                latest_price = data['Close'].iloc[-1]
                previous_close = data['Close'].iloc[0]
                change = latest_price - previous_close
                change_percent = (change / previous_close) * 100
                
                indices_data['us'][symbol] = {
                    'name': 'Dow Jones' if symbol == '^DJI' else 'S&P 500' if symbol == '^GSPC' else 'NASDAQ',
                    'price': round(latest_price, 2),
                    'change': round(change, 2),
                    'change_percent': round(change_percent, 2)
                }
        
        # Fetch global indices data...
        for symbol in global_indices:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period='1d', interval='1m')
            if not data.empty:
                latest_price = data['Close'].iloc[-1]
                previous_close = data['Close'].iloc[0]
                change = latest_price - previous_close
                change_percent = (change / previous_close) * 100
                
                indices_data['global'][symbol] = {
                    'name': 'FTSE 100' if symbol == '^FTSE' else 'Nikkei 225',
                    'price': round(latest_price, 2),
                    'change': round(change, 2),
                    'change_percent': round(change_percent, 2)
                }

        # Fetch sector performance data...
        for symbol, name in sectors.items():
            ticker = yf.Ticker(symbol)
            data = ticker.history(period='1d', interval='1m')
            if not data.empty:
                latest_price = data['Close'].iloc[-1]
                previous_close = data['Close'].iloc[0]
                change = latest_price - previous_close
                change_percent = (change / previous_close) * 100
                
                indices_data['sectors'][symbol] = {
                    'name': name,
                    'price': round(latest_price, 2),
                    'change': round(change, 2),
                    'change_percent': round(change_percent, 2)
                }

        # Fetch volume leaders and top movers data
        volume_data = []
        performance = []
        
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                data = stock.history(period='2d')
                if len(data) > 1:
                    # Volume data
                    latest_volume = data['Volume'].iloc[-1]
                    previous_volume = data['Volume'].iloc[-2]
                    volume_change_pct = ((latest_volume - previous_volume) / previous_volume) * 100
                    
                    # Price data for movers
                    latest_price = data['Close'].iloc[-1]
                    previous_close = data['Close'].iloc[-2]
                    price_change = latest_price - previous_close
                    price_change_percent = (price_change / previous_close) * 100
                    
                    # Format volume
                    formatted_volume = f"{latest_volume / 1e9:.1f}B" if latest_volume >= 1e9 else f"{latest_volume / 1e6:.1f}M"
                    
                    volume_data.append({
                        'symbol': ticker,
                        'volume': formatted_volume,
                        'volume_raw': latest_volume,  # For sorting
                        'volume_change_percent': round(volume_change_pct, 1),
                        'price': round(latest_price, 2),
                        'change_percent': round(price_change_percent, 2)
                    })
                    
                    performance.append({
                        'symbol': ticker,
                        'price': round(latest_price, 2),
                        'change': round(price_change, 2),
                        'change_percent': round(price_change_percent, 2)
                    })
            except Exception as e:
                logger.error(f"Error processing {ticker}: {e}")
                continue

        # Sort and get top 5 volume leaders
        volume_data.sort(key=lambda x: x['volume_raw'], reverse=True)
        indices_data['volume_leaders'] = [
            {k: v for k, v in item.items() if k != 'volume_raw'}  # Remove volume_raw from response
            for item in volume_data[:5]
        ]
        
        # Sort and get top movers
        performance.sort(key=lambda x: x['change_percent'], reverse=True)
        indices_data['movers']['gainers'] = performance[:5]
        indices_data['movers']['losers'] = performance[-5:]
        
        return Response(indices_data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def market_chat(request):
    """
    Endpoint for handling market-specific chat messages and generating responses
    using real-time market data from yfinance, OpenAI, and Finnhub.
    """
    try:
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=400)
            
        # Initialize OpenAI client
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Get real-time market data based on the question
        market_data = {}
        message_lower = message.lower()
        
        # Fetch relevant data based on the question type
        if any(keyword in message_lower for keyword in ['sector', 'sectors']):
            # Fetch sector performance data using yfinance
            sectors = {
                "XLK": "Technology",
                "XLV": "Healthcare", 
                "XLF": "Financials",
                "XLE": "Energy",
                "XLI": "Industrials",
                "XLC": "Communication"
            }
            sector_data = {}
            for symbol, name in sectors.items():
                ticker = yf.Ticker(symbol)
                data = ticker.history(period='1d')
                if not data.empty:
                    latest_price = data['Close'].iloc[-1]
                    previous_close = data['Close'].iloc[0]
                    change_percent = ((latest_price - previous_close) / previous_close) * 100
                    sector_data[name] = {
                        'price': round(latest_price, 2),
                        'change_percent': round(change_percent, 2)
                    }
            market_data['sectors'] = sector_data
            
        elif any(keyword in message_lower for keyword in ['volume', 'trading volume']):
            # Fetch volume data for major stocks using yfinance
            tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "META"]
            volume_data = {}
            for symbol in tickers:
                ticker = yf.Ticker(symbol)
                data = ticker.history(period='1d')
                if not data.empty:
                    volume = data['Volume'].iloc[-1]
                    volume_data[symbol] = {
                        'volume': f"{volume/1e6:.1f}M" if volume < 1e9 else f"{volume/1e9:.1f}B"
                    }
            market_data['volume'] = volume_data
            
        elif any(keyword in message_lower for keyword in ['global', 'international']):
            # Fetch global indices data using yfinance
            indices = {'^FTSE': 'FTSE 100', '^N225': 'Nikkei 225'}
            global_data = {}
            for symbol, name in indices.items():
                ticker = yf.Ticker(symbol)
                data = ticker.history(period='1d')
                if not data.empty:
                    latest_price = data['Close'].iloc[-1]
                    previous_close = data['Close'].iloc[0]
                    change_percent = ((latest_price - previous_close) / previous_close) * 100
                    global_data[name] = {
                        'price': round(latest_price, 2),
                        'change_percent': round(change_percent, 2)
                    }
            market_data['global'] = global_data
            
        elif any(keyword in message_lower for keyword in ['movers', 'gainers', 'losers']):
            # Fetch top movers data using yfinance
            tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA"]
            performance_data = []
            for symbol in tickers:
                ticker = yf.Ticker(symbol)
                data = ticker.history(period='1d')
                if not data.empty:
                    latest_price = data['Close'].iloc[-1]
                    previous_close = data['Close'].iloc[0]
                    change_percent = ((latest_price - previous_close) / previous_close) * 100
                    performance_data.append({
                        'symbol': symbol,
                        'price': round(latest_price, 2),
                        'change_percent': round(change_percent, 2)
                    })
            performance_data.sort(key=lambda x: x['change_percent'], reverse=True)
            market_data['movers'] = {
                'gainers': performance_data[:3],
                'losers': performance_data[-3:]
            }
            
        # Get sentiment data from Finnhub
        try:
            sentiment = finnhub_client.news_sentiment("SPY")  # Use SPY as market proxy
            market_data['sentiment'] = {
                'bullish_percent': sentiment.get('sentiment', {}).get('bullishPercent', 0),
                'bearish_percent': sentiment.get('sentiment', {}).get('bearishPercent', 0)
            }
        except Exception as e:
            logger.warning(f"Failed to fetch sentiment data: {e}")
        
        # Create a prompt with the market data
        prompt = f"""You are a market insights assistant with access to real-time financial data. Answer the following question using the provided real-time market data:

Question: {message}

Real-time Market Data:
{json.dumps(market_data, indent=2)}

Please provide a concise and informative response focusing on the key insights from the data.
If the data doesn't contain information relevant to the question, provide a general market analysis based on the available data.
Use specific numbers and percentages when available, and format currency values appropriately.
Keep your response focused on the market data and avoid making predictions or giving financial advice.
"""

        # Generate response using GPT
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a knowledgeable market analyst providing real-time market insights."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=150
        )
        
        return Response({
            'response': response.choices[0].message.content.strip()
        })
        
    except Exception as e:
        logger.error(f"Error in market chat: {str(e)}", exc_info=True)
        return Response({
            'error': 'An error occurred while processing your request.',
            'detail': str(e) if settings.DEBUG else None
        }, status=500)

@api_view(['GET'])
def get_market_suggested_questions(request):
    """Get suggested questions for market insights"""
    questions = [
        "What are the top performing sectors today?",
        "Which stocks have the highest trading volume?",
        "How are global markets performing today?",
        "What are today's biggest market movers?",
        "Compare technology sector vs healthcare sector",
        "What's the current market sentiment?",
        "Show me the performance of energy stocks",
        "How are financial stocks doing today?"
    ]
    return Response({'questions': questions})

@api_view(['GET'])
def get_company_comparison(request, symbols):
    """Fetch comparison data for multiple companies."""
    try:
        # Split the symbols string into a list
        symbol_list = symbols.split(',')
        
        # Limit to maximum 5 companies for performance
        symbol_list = symbol_list[:5]
        
        comparison_data = {}
        
        for symbol in symbol_list:
            try:
                # Get basic financials from Finnhub
                basic_financials = finnhub_client.company_basic_financials(symbol, 'all')
                company_profile = finnhub_client.company_profile2(symbol=symbol)
                
                # Get real-time quote
                quote = finnhub_client.quote(symbol)
                
                # Get metrics
                metrics = basic_financials.get('metric', {})
                
                # Format the data
                comparison_data[symbol] = {
                    'symbol': symbol,
                    'companyName': company_profile.get('name', symbol),
                    'price': quote.get('c', 0),  # Current price
                    'change': quote.get('d', 0),  # Price change
                    'changePercent': quote.get('dp', 0),  # Percent change
                    'marketCap': company_profile.get('marketCapitalization', 0),
                    'peRatio': metrics.get('peBasicExcl', 0),
                    'revenue': metrics.get('revenuePerShareAnnual', 0) * (company_profile.get('shareOutstanding', 0) or 0),
                    'revenueGrowth': metrics.get('revenueGrowthTTM', 0),
                    'employees': company_profile.get('employeeTotal', 0),
                    'profitMargin': metrics.get('netMarginTTM', 0),
                    'dividendYield': metrics.get('dividendYieldIndicatedAnnual', 0)
                }
                
            except Exception as e:
                logger.error(f"Error fetching data for {symbol}: {str(e)}")
                comparison_data[symbol] = {
                    'symbol': symbol,
                    'error': f"Failed to fetch data for {symbol}"
                }
        
        return JsonResponse(comparison_data)
        
    except Exception as e:
        logger.error(f"Error in company comparison: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)