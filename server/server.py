import importlib
import pkgutil
from flask import Flask
import logging
import threading
import time
import flask
import requests
from importlib import import_module
from pathlib import Path
from flask import Blueprint
from constants.constants import COMPANIES_LIST

app = Flask(__name__)
logger = logging.getLogger(__name__)

handler_groups = [
    name for _, name, _ in pkgutil.iter_modules(["server/handlers", "handlers"])
]
for handler in handler_groups:
    mod = importlib.import_module(f"handlers.{handler}", "handlers")
    if hasattr(mod, "bp") and isinstance(mod.bp, flask.Blueprint):
        app.register_blueprint(mod.bp)
    
def run_flask():
    """Function to run Flask server"""
    app.run(debug=False, port=5000, host='0.0.0.0')

def main():
    """
    Main function to process companies from COMPANIES_LIST
    """
    # Wait for server to start
    time.sleep(2)
    
    base_url = "http://localhost:5000/earning-calls"
    
    for company in COMPANIES_LIST:
        try:
            logger.info(f"Fetching data for {company}...")
            response = requests.get(f"{base_url}/{company}")
            if response.status_code == 200:
                logger.info(f"Successfully fetched data for {company}")
            else:
                logger.info(f"Failed to fetch data for {company}. Status code: {response.status_code}")
        except Exception as e:
            logger.error(f"Error processing {company}: {str(e)}")
    
    logger.info("\nInitial data fetching completed. Server will continue running...")
    while True:
        time.sleep(86400)

if __name__ == '__main__':
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()
    
    # Run the main function
    main()