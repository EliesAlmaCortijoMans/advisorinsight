from flask import Blueprint, jsonify
from services.fetch_and_transform_earning_calls_service import fetch_from_finnhub, fetch_audio_and_transcripts_data

bp = Blueprint("earning_calls", __name__, url_prefix="/earning-calls")

@bp.route('/<id>', methods=["GET"])
def get_last_two_calls(id: str):
    """API endpoint to fetch and return transcript data."""
    try:
        transcript = fetch_from_finnhub(id)
        audio_and_transcripts = fetch_audio_and_transcripts_data(transcript)
        return audio_and_transcripts

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500