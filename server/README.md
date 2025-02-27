# Earning Calls Data Server

This server application fetches and processes earning calls data for specified companies. It provides a REST API to access the processed data and maintains a continuous running state for data availability.

## Project Structure

    ``` graph
        server/
        ├── constants/
        │   └── constants.py      # Contains configuration and company list
        ├── handlers/
        │ └── # contains all the handlers for the app
        ├── services/
        │ └── #contains all the services for the app
        ├── utils/
        │   └── path_utils.py
        ├── data/                 # Storage for processed data
        │   └── AAPL/
        │       └── transcripts/
        ├── requirements.txt
        └── server.py            # Main server file
    ```

## Prerequisites

- Python 3.12.7
- Make (for using Makefile commands)

## Setup

1. Clean the data directory if exists and venv to ensure a fresh start:

        make clean

2. Create a virtual environment:
        make venv

    After the virtual environment is created, activate it:
        source venv/bin/activate

3. Run the server:

        make server

The server will:
    1. Start a Flask server on `http://localhost:5000`
    2. Process earning calls data for all companies in `COMPANIES_LIST`
    3. Continue running to serve requests after initial processing

## API Endpoints

- `GET /earning-calls/<company_symbol>`: Fetches and processes earning calls data for the specified company

## Data Management

To clean all processed data:

    make clean

This will remove:
    - All processed transcripts
    - Audio files
    - The entire data directory

## Configuration

Company symbols are configured in `server/constants/constants.py`. Modify `COMPANIES_LIST` to add or remove companies for processing.

## Server Behavior

- The server runs continuously after initial data processing
- The Flask server runs in a daemon thread
- The main thread keeps the application alive
- The server can be stopped using Ctrl+C

## Error Handling

- Failed requests are logged with their status codes
- Exceptions during processing are caught and logged
- The server continues running even if individual company processing fails

## Development

To modify the company list, update `COMPANIES_LIST` in `server/constants/constants.py`.

## Notes

- The server runs on port 5000 by default
- It's accessible from any network interface (0.0.0.0)
- Debug mode is disabled for production safety
