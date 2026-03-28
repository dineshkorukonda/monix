# Use a slim Python image for a smaller footprint
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set the working directory
WORKDIR /app

# Install system dependencies (e.g., for PostgreSQL or networking checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Install the package in editable mode if needed for imports
RUN pip install -e .

# The default command (can be overridden by Render/Railway per service)
# For Django: gunicorn core.config.wsgi --bind 0.0.0.0:$PORT
# For Flask:  gunicorn api.server:app --bind 0.0.0.0:$PORT
CMD ["gunicorn", "core.config.wsgi", "--bind", "0.0.0.0:8000"]
