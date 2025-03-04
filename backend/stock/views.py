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

# Load environment variables
load_dotenv()
FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")

# Create a session with retry logic
session = requests.Session()
retries = Retry(total=5, backoff_factor=1, status_forcelist=[502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))

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

IN_PROGRESS_TICKERS = ["AAPL", "TSLA", "IBM", "NVDA", "MSFT"]
PAST_TICKER = "WMT"
UPCOMING_TICKER = "GME"

TIME_MAPPING = {
    "ongoing": "dmh",
    "past": "amc",
    "upcoming": "bmo"
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
        # Get the base directory for transcripts
        base_dir = Path(__file__).resolve().parent.parent / 'data' / symbol / 'transcripts'
        print(f"Looking for transcripts in: {base_dir}")
        
        if not os.path.exists(base_dir):
            print(f"Directory not found: {base_dir}")
            return JsonResponse({
                'success': False,
                'error': f'No transcripts found for {symbol}'
            }, status=404)
        
        # Get all transcript files for the company
        transcript_files = sorted(
            [f for f in os.listdir(base_dir) if f.endswith('.json')],
            reverse=True  # Most recent first
        )
        print(f"Found transcript files: {transcript_files}")
        
        transcripts = []
        for file_name in transcript_files:
            try:
                with open(base_dir / file_name, 'r') as f:
                    transcript_data = json.load(f)
                    transcripts.append(transcript_data)
            except Exception as e:
                print(f"Error reading file {file_name}: {str(e)}")
                continue
        
        if not transcripts:
            return JsonResponse({
                'success': False,
                'error': 'No valid transcripts found'
            }, status=404)
        
        return JsonResponse({
            'success': True,
            'transcripts': transcripts
        })
    except Exception as e:
        print(f"Error in get_company_transcripts: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def fetch_earnings(from_date, to_date, symbol):
    url = "https://finnhub.io/api/v1/calendar/earnings"
    params = {
        "from": from_date,
        "to": to_date,
        "symbol": symbol,
        "token": FINNHUB_API_KEY
    }
    response = session.get(url, params=params, timeout=120)
    response.raise_for_status()
    return response.json().get("earningsCalendar", [])

def format_eps(value):
    if value is not None:
        return f"${float(value):.2f}"
    return None

def get_earnings_schedule_view(request):
    try:
        today = datetime.date.today()
        past_date = today - datetime.timedelta(days=365)
        future_date = today + datetime.timedelta(days=365)
        
        earnings_data = []
        all_tickers = IN_PROGRESS_TICKERS + [PAST_TICKER, UPCOMING_TICKER]
        
        for ticker in all_tickers:
            earnings = fetch_earnings(str(past_date), str(future_date), ticker)
            sorted_earnings = sorted(earnings, key=lambda x: x["date"])
            past_earnings = [e for e in sorted_earnings if e["date"] < str(today)]
            future_earnings = [e for e in sorted_earnings if e["date"] > str(today)]
            
            if ticker in IN_PROGRESS_TICKERS and past_earnings:
                most_recent = past_earnings[-1]
                earnings_data.append({
                    "company": COMPANY_NAMES[ticker],
                    "symbol": most_recent["symbol"],
                    "date": str(today),
                    "time": TIME_MAPPING["ongoing"],
                    "status": "ongoing",
                    "expectedEPS": format_eps(most_recent.get("epsEstimate"))
                })
                
            elif ticker == PAST_TICKER and past_earnings:
                most_recent = past_earnings[-1]
                earnings_data.append({
                    "company": COMPANY_NAMES[ticker],
                    "symbol": most_recent["symbol"],
                    "date": most_recent["date"],
                    "time": TIME_MAPPING["past"],
                    "status": "past",
                    "expectedEPS": format_eps(most_recent.get("epsEstimate")),
                    "actualEPS": format_eps(most_recent.get("epsActual"))
                })
                
            elif ticker == UPCOMING_TICKER and future_earnings:
                next_earnings = future_earnings[0]
                earnings_data.append({
                    "company": COMPANY_NAMES[ticker],
                    "symbol": next_earnings["symbol"],
                    "date": next_earnings["date"],
                    "time": TIME_MAPPING["upcoming"],
                    "status": "upcoming",
                    "expectedEPS": format_eps(next_earnings.get("epsEstimate"))
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