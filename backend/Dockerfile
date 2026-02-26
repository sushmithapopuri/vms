# Use Python 3.11 slim image for a smaller footprint
FROM python:3.11-slim

# Set environment variables
# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.7.1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1 \
    POETRY_CACHE_DIR='/var/cache/pypoetry'

# Install system dependencies required for building some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install "poetry==$POETRY_VERSION"

# Set working directory
WORKDIR /app

# Copy only dependency files first to leverage Docker cache
COPY pyproject.toml poetry.lock* /app/

# Install dependencies without installing the project itself
RUN poetry install --no-root --only main

# Copy the rest of the application code
COPY . /app/

# Ensure start script is executable
RUN chmod +x /app/start.sh

# Create storage directory for face images if it doesn't exist
RUN mkdir -p /app/storage/faces

# Expose the application port
EXPOSE 8000

# Run the start script
CMD ["/app/start.sh"]
