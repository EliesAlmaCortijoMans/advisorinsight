from .config import *
from langchain.chat_models import ChatOpenAI
from django.conf import settings

def llm_call():
    # Initialize Azure ChatOpenAI

    llm = ChatOpenAI(
    model=GPT_MODEL,
    temperature=0.3,
    api_key=settings.OPENAI_API_KEY
    )
    return llm

