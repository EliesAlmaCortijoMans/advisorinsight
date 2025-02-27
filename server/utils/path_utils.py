from pathlib import Path

def get_audio_file_path(symbol: str, transcript_id: str) -> Path:
    """
    Constructs the path to the audio file in {symbol}/data/audio directory
    
    Args:
        symbol: The stock symbol (e.g., 'AAPL')
        transcript_id: The ID of the transcript
        
    Returns:
        Path to audio file: {symbol}/data/audio/{transcript_id}.json
    """
    audio_dir = Path(f"data/{symbol}/audios")
    audio_dir.mkdir(parents=True, exist_ok=True)
    return audio_dir / f"{transcript_id}.json"

def get_transcript_file_path(symbol: str, transcript_id: str) -> Path:
    """
    Constructs the path to the transcript file in {symbol}/data/transcripts directory
    
    Args:
        symbol: The stock symbol (e.g., 'AAPL')
        transcript_id: The ID of the transcript
        
    Returns:
        Path to transcript file: {symbol}/data/transcripts/{transcript_id}.json
    """
    transcript_dir = Path(f"data/{symbol}/transcripts")
    transcript_dir.mkdir(parents=True, exist_ok=True)
    return transcript_dir / f"{transcript_id}.json"
