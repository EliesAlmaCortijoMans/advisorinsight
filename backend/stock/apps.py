from django.apps import AppConfig
import os
import json
import redis
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class StockConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stock'

    def ready(self):
        """
        Called when Django starts. This is where we'll preload transcripts into Redis.
        """
        # Skip this in manage.py check to avoid running twice
        if os.environ.get('RUN_MAIN') != 'true':
            self.preload_transcripts()

    def preload_transcripts(self):
        """
        Preload all company transcripts into Redis cache
        """
        try:
            # Initialize Redis client
            redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                db=0,
                decode_responses=True
            )

            # Company symbols we want to cache
            symbols = ["AAPL", "TSLA", "WMT", "IBM", "GME", "NVDA", "MSFT"]
            
            # Base directory for transcripts
            base_dir = Path(__file__).resolve().parent.parent / 'data'
            
            for symbol in symbols:
                try:
                    transcript_dir = base_dir / symbol / 'transcripts'
                    if not transcript_dir.exists():
                        logger.warning(f"No transcript directory found for {symbol}")
                        continue

                    # Get all transcript files for the company
                    transcript_files = sorted(
                        [f for f in os.listdir(transcript_dir) if f.endswith('.json')],
                        reverse=True
                    )

                    if not transcript_files:
                        logger.warning(f"No transcript files found for {symbol}")
                        continue

                    transcripts = []
                    for file_name in transcript_files:
                        try:
                            with open(transcript_dir / file_name, 'r') as f:
                                transcript_data = json.load(f)
                                transcripts.append(transcript_data)
                        except Exception as e:
                            logger.error(f"Error reading transcript file {file_name} for {symbol}: {e}")
                            continue

                    if transcripts:
                        # Cache the transcripts in Redis for 24 hours
                        cache_key = f"transcripts:{symbol}"
                        redis_client.setex(
                            cache_key,
                            24 * 60 * 60,  # 24 hours
                            json.dumps(transcripts)
                        )
                        logger.info(f"Successfully cached {len(transcripts)} transcripts for {symbol}")
                    else:
                        logger.warning(f"No valid transcripts found for {symbol}")

                except Exception as e:
                    logger.error(f"Error processing transcripts for {symbol}: {e}")
                    continue

            logger.info("Completed preloading transcripts into Redis cache")

        except Exception as e:
            logger.error(f"Error in preload_transcripts: {e}") 