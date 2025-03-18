import os
import json
import pandas as pd
from os.path import join
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from django.conf import settings
from dotenv import load_dotenv
load_dotenv()
import re
from .config import SENTIMENT_PROMPT, MAX_CHUNK_SIZE_SENTIMENT

class EarningsCallAnalyzer:
    def __init__(self, llm_call):
        # Initialize OpenAI
        self.llm = llm_call
        # JSON output parser
        self.parser = JsonOutputParser()
        self.data_dir = os.path.join(settings.BASE_DIR, 'data')
    def read_simple_json(self, current_transcript):
        with open(current_transcript) as f:
            data = json.load(f)
            return data['transcript']

    def read_finnhub_json(self, json_dir):
        most_recent_time = None
        most_recent_json = None
        
        if not os.path.exists(json_dir):
            print(f"Directory not found: {json_dir}")
            return ""

        print(f"Reading transcripts from: {json_dir}")
        for filename in os.listdir(json_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(json_dir, filename)
                print(f"Processing file: {filename}")
                with open(filepath, 'r', encoding='utf-8') as file:
                    try:
                        data = json.load(file)
                        if 'time' in data:
                            current_time = pd.to_datetime(data['time'])
                            if most_recent_time is None or current_time > most_recent_time:
                                most_recent_time = current_time
                                most_recent_json = data
                                print(f"Found newer transcript from: {current_time}")
                    except json.JSONDecodeError as e:
                        print(f"Error decoding JSON in file {filename}: {str(e)}")
        
        if most_recent_json is None:
            print("No valid transcripts found")
            return ""

        # Extract transcript text
        transcript_text = "\n".join(
            f"{entry['name']}: {' '.join(entry['speech'])}" 
            for entry in most_recent_json.get("transcript", [])
        ) if most_recent_json else ""

        print(f"Transcript length: {len(transcript_text)} characters")
        return transcript_text

    def analyze_text(self, symbol: str, status: str) -> Dict[str, Any]:
        """
        Analyze earnings call transcript for sentiment, keywords, and emotions
        
        Args:
            symbol (str): Stock symbol
            status (str): 'present' for ongoing call, 'past' for historical call
        
        Returns:
            Dict containing analysis results
        """
        try:
            transcript_path = None
            if status == 'present':
                transcript_path = join(self.data_dir, symbol, 'transcripts', 'ongoing.json')
                if os.path.exists(transcript_path):
                    current_transcript = self.read_simple_json(transcript_path)
                else:
                    print(f"No ongoing transcript found at: {transcript_path}")
                    current_transcript = None
            else:
                transcript_dir = join(self.data_dir, symbol, 'transcripts')
                current_transcript = self.read_finnhub_json(transcript_dir)

            if not current_transcript:
                return {
                    "error": "No transcript found",
                    "details": f"No valid transcript found for symbol {symbol} with status {status}"
                }

            # Create prompt template
            prompt = ChatPromptTemplate.from_messages([
                ("system", SENTIMENT_PROMPT)
            ])

            # Check if the transcript needs to be chunked
            if len(current_transcript) > MAX_CHUNK_SIZE_SENTIMENT:
                print(f"Transcript exceeds {MAX_CHUNK_SIZE_SENTIMENT} characters. Processing in chunks...")
                # Split transcript into chunks
                chunks = self._split_transcript_into_chunks(current_transcript, MAX_CHUNK_SIZE_SENTIMENT)
                
                # Initialize counters for aggregation
                total_positive_count = 0
                total_negative_count = 0
                total_hesitation_count = 0
                sentiments = []
                
                # Process each chunk
                for i, chunk in enumerate(chunks):
                    print(f"Processing chunk {i+1}/{len(chunks)}...")
                    
                    # Create chain
                    chain = prompt | self.llm | self.parser
                    
                    # Analyze chunk
                    chunk_analysis = chain.invoke({
                        "transcript": chunk
                    })
                    
                    # Aggregate results
                    total_positive_count += chunk_analysis.get("positive_keywords_count", 0)
                    total_negative_count += chunk_analysis.get("negative_keywords_count", 0)
                    total_hesitation_count += chunk_analysis.get("hesitation_markers_count", 0)
                    sentiments.append(chunk_analysis.get("sentiment", "Neutral"))
                
                # Determine overall sentiment based on majority vote
                sentiment_counts = {s: sentiments.count(s) for s in set(sentiments)}
                overall_sentiment = max(sentiment_counts.items(), key=lambda x: x[1])[0]
                
                # Create final aggregated analysis
                analysis = {
                    "sentiment": overall_sentiment,
                    "positive_keywords_count": total_positive_count,
                    "negative_keywords_count": total_negative_count,
                    "hesitation_markers_count": total_hesitation_count
                }
            else:
                # Create chain for single processing
                chain = prompt | self.llm | self.parser
                
                # Analyze transcript as a single chunk
                analysis = chain.invoke({
                    "transcript": current_transcript
                })
            
            print(f"Analysis completed successfully for {symbol}")
            return analysis
        except Exception as e:
            print(f"Error during analysis: {str(e)}")
            return {
                "error": str(e),
                "message": "Failed to analyze transcript"
            }

    def _split_transcript_into_chunks(self, transcript: str, max_chunk_size: int) -> list[str]:
        """
        Split a transcript into chunks of approximately max_chunk_size characters.
        Tries to split at paragraph or sentence boundaries when possible.
        
        Args:
            transcript (str): The full transcript text
            max_chunk_size (int): Maximum size of each chunk in characters
            
        Returns:
            List[str]: List of transcript chunks
        """
        chunks = []
        
        # Try to split by paragraphs first (double newlines)
        paragraphs = transcript.split('\n\n')
        
        current_chunk = ""
        for paragraph in paragraphs:
            # If adding this paragraph would exceed max size and we already have content
            if len(current_chunk) + len(paragraph) > max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = paragraph
            else:
                # Add paragraph separator if not the first paragraph in chunk
                if current_chunk:
                    current_chunk += '\n\n'
                current_chunk += paragraph
        
        # Don't forget the last chunk
        if current_chunk:
            chunks.append(current_chunk)
        
        # If any chunk is still too large, split by sentences
        final_chunks = []
        for chunk in chunks:
            if len(chunk) > max_chunk_size:
                sentences = re.split(r'(?<=[.!?])\s+', chunk)
                current_chunk = ""
                
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) > max_chunk_size and current_chunk:
                        final_chunks.append(current_chunk)
                        current_chunk = sentence
                    else:
                        # Add space if not the first sentence in chunk
                        if current_chunk:
                            current_chunk += ' '
                        current_chunk += sentence
                
                if current_chunk:
                    final_chunks.append(current_chunk)
            else:
                final_chunks.append(chunk)
        
        return final_chunks
    

if __name__=='__main__':
    from llm_service import llm_call
    obj = EarningsCallAnalyzer(llm_call())
    print(obj.analyze_text('AAPL', 'present'))
