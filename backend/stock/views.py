from django.http import JsonResponse
import json
import os
from pathlib import Path
from django.conf import settings

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
            
            # Use the full URL for audio files
            audio_url = f'http://localhost:8000/media/{symbol}/audios/{audio_file_name}'
            
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