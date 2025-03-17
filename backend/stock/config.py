GPT_MODEL = "gpt-4o"
# Define max chunk size (in characters)
MAX_CHUNK_SIZE_SENTIMENT = 8000  # Adjust based on your LLM's context window

SENTIMENT_PROMPT = """You are an expert financial analyst specializing in earnings call transcript analysis. 
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

QA_ANALYSIS_PROMPT =  """
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