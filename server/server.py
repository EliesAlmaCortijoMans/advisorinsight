from flask import Flask
import logging
import sys
import requests
from handlers import get_all_blueprints
import threading
import time
from constants.constants import COMPANIES_LIST  # Import the list directly

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Register all blueprints
for blueprint in get_all_blueprints():
    app.register_blueprint(blueprint)
    
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