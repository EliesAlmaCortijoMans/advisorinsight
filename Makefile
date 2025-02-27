# This is the Makefile for the Advisor Insights Dashboard
.PHONY: server

# Create a virtual environment and install the requirements
venv:
	python3 -m venv venv && \
	. venv/bin/activate && \
	python3 -m pip install -r server/requirements.txt

# Run the server and the earning call handler
server:
	cd server && python server.py

# Clean the data directory
clean:
	rm -rf server/data/*
	rm -rf server/data/audio/*
	rm -rf server/data/transcripts/*
	rm -rf server/data

remove_venv:
	rm -rf venv
