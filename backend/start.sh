#!/bin/bash

# Run migrations
echo "Running database migrations..."
python migrate.py

# Start the application
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
