import os
import faiss
import dotenv
import logging
import glob
from concurrent.futures import ThreadPoolExecutor
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

dotenv.load_dotenv()

# Configurations
CHUNK_SIZE = 1000
OVERLAP_SIZE = 200
INDEX_DIR = "vector_dbs"
PDF_DIR = "./data"
API_KEY = os.getenv("OPENAI_API_KEY")
SYMBOLS = ['AAPL', 'WMT', 'TSLA', 'MSFT', 'IBM', 'GME', 'NVDA']

if not API_KEY:
    raise ValueError("OpenAI API Key not found! Make sure it exists in .env file.")

# Initialize the embedding model once (avoids unnecessary API calls)
embeddings = OpenAIEmbeddings(openai_api_key=API_KEY)

def find_pdf_file(symbol):
    """Find the correct PDF file matching the stock symbol."""
    pdf_pattern = os.path.join(PDF_DIR, symbol, "sec_filing", f"{symbol}.pdf")
    matching_files = list(glob.iglob(pdf_pattern))
    if matching_files:
        return matching_files[0]
    raise FileNotFoundError(f"File not found for symbol: {symbol}. Make sure the file exists.")

def create_faiss_index(symbol):
    """Creates a FAISS index for a given stock symbol's financial filing PDF."""
    try:
        pdf_path = find_pdf_file(symbol)
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=OVERLAP_SIZE)
        chunks = text_splitter.split_documents(documents)

        logger.info(f"Creating FAISS index for {symbol}...")
        vectorstore = FAISS.from_documents(chunks, embeddings)

        os.makedirs(INDEX_DIR, exist_ok=True)
        index_file = os.path.join(INDEX_DIR, f"{symbol}_faiss.index")
        vectorstore.save_local(index_file)

    except Exception as e:
        logger.error(f"Error creating FAISS index for {symbol}: {e}")

def process_pdfs():
    """Process PDFs concurrently and create FAISS indexes."""
    if not os.path.exists(PDF_DIR):
        logger.critical(f"No directory named '{PDF_DIR}' found. Please add your SEC filings.")
        return

    with ThreadPoolExecutor(max_workers=min(len(SYMBOLS), 4)) as executor:
        executor.map(create_faiss_index, SYMBOLS)

    logger.info("FAISS indexes generated successfully.")

if __name__ == "__main__":
    process_pdfs()
