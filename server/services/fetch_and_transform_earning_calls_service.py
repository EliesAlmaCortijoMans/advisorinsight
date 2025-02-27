import requests
import dotenv
import logging
import json
from pathlib import Path
import os
from constants.constants import FINNHUB_TRANSCRIPT_URL
from utils.path_utils import get_transcript_file_path, get_audio_file_path
from utils.env_var_util import FINNHUB_API_KEY

dotenv.load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_earning_call_data_list(id):
    return f"{FINNHUB_TRANSCRIPT_URL}?symbol={id}&token={FINNHUB_API_KEY}"

def get_transcript_url(id):
    return f"{FINNHUB_TRANSCRIPT_URL}?id={id}&token={FINNHUB_API_KEY}"

def fetch_from_finnhub(id):
    """Fetch transcript data directly from FinnHub API"""
    response = requests.get(get_earning_call_data_list(id))
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch transcript from FinnHub with url: {get_earning_call_data_list(id)}")
    
    data = response.json()
    
    filtered_response = {
        "symbol": data["symbol"],
        "transcripts": data["transcripts"][:2]
    }
    
    logging.info(f"Fetched FinnHub data for {id}")
    return filtered_response

def save_audio_to_file(transcript_id: str, audio_url: str, symbol: str):
    """
    Download and save audio file from the given URL
    
    Args:
        transcript_id: ID of the transcript
        audio_url: URL to the MP3 file
        symbol: Stock symbol (e.g., 'AAPL')
    """
    audio_file_path = get_audio_file_path(symbol=symbol, transcript_id=transcript_id)
       
    try:
        response = requests.get(audio_url, stream=True)
        response.raise_for_status()
        
        audio_file_path = audio_file_path.with_suffix('.mp3')

        with open(audio_file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    
        logger.info(f"Successfully downloaded and saved audio file to {audio_file_path}")

    except requests.RequestException as e:
        logger.error(f"Failed to download audio file: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to save audio file: {str(e)}")

def save_transcript_to_file(transcript_data: dict, symbol: str):
    """Save transcript data to a JSON file"""

    transcript_id = transcript_data.get("id")
    if not transcript_id:
        logger.error("Transcript data does not contain an ID")
        return

    filtered_data = transcript_data.copy()

    audio_data = filtered_data.pop('audio', '')

    if audio_data:
        save_audio_to_file(transcript_id, audio_data, symbol)
    else:
        logger.info(f"No audio data found for {transcript_id}. Skipping audio file download.")
    
    transcript_file_path = get_transcript_file_path(symbol=symbol, transcript_id=transcript_id) 

    try:
        with open(transcript_file_path, 'w') as f:
            json.dump(filtered_data, f, indent=2)
        logger.info(f"Successfully saved transcript to {transcript_file_path}")

    except Exception as e:
        logger.error(f"Failed to save transcript to file: {str(e)}")

def fetch_audio_and_transcripts_data(transcripts: dict):
    """Fetch transcript data directly from FinnHub API"""
    transcript_results = []
    saved_files = []
    
    symbol = transcripts["symbol"]
    for earning_call in transcripts["transcripts"]:
        response = requests.get(get_transcript_url(earning_call["id"]))
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch transcript from FinnHub with url: {get_transcript_url(earning_call['id'])}")
        
        data = response.json()

        transcript_results.append(data)
        save_transcript_to_file(data, symbol)
        saved_files.append(f"{data['symbol']}_{data['id']}")
    
    if saved_files:
        logging.info(f"Successfully processed {len(saved_files)} transcripts. Files: {', '.join(saved_files)}")
    
    return transcript_results