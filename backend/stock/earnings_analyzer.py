import os
import json
import pandas as pd
from os.path import join
from typing import Dict, Any
from langchain.chat_models import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from django.conf import settings
from dotenv import load_dotenv
load_dotenv()

class EarningsCallAnalyzer:
    def __init__(self):
        # Initialize OpenAI
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo-16k",
            temperature=0.3,
            api_key=settings.OPENAI_API_KEY
        )
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

            # Prompt for comprehensive analysis
            system_prompt = """You are an expert financial analyst specializing in earnings call transcript analysis. 
            Analyze the following earnings call transcript and provide a JSON-formatted analysis with the following details:

            1. Determine the overall sentiment of the call as one of the following:
                * Positive: when the overall tone is optimistic, highlighting growth, success, or positive outlook
                * Negative: when the tone emphasizes challenges, declines, or concerns
                * Neutral: when the tone is balanced or primarily factual
                        
            2. Count specific keywords and phrases in the transcript:
               - Positive keywords count: Count words/phrases like "growth", "increase", "success", "strong", "improvement", 
                 "exceeded", "better than expected", "confident", "optimistic", "record", "outperform"
               - Negative keywords count: Count words/phrases like "decline", "decrease", "challenge", "difficult", "below expectations",
                 "miss", "weakness", "concern", "risk", "underperform"
               - Hesitation markers count: Count filler words and phrases like "um", "uh", "well", "you know", "sort of", 
                 "kind of", "I mean", "like", "I think", "maybe"

            Transcript:
            {transcript}

            Return ONLY a JSON object with these exact keys:
            {{
                "sentiment": "Positive/Negative/Neutral",
                "positive_keywords_count": number,
                "negative_keywords_count": number,
                "hesitation_markers_count": number
            }}"""

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt)
            ])

            # Create chain
            chain = prompt | self.llm | self.parser
            
            # Analyze transcript
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