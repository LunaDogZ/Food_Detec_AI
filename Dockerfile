# Use Python slim image to keep size small but include necessary tools
FROM python:3.10-slim

# Install system dependencies required by OpenCV and Uvicorn
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to the app root inside the container
WORKDIR /app

# Copy the backend requirements first to cache them in Docker layer
COPY backend/requirements.txt /app/backend/

# Install the Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the backend source code (including static UI files)
COPY backend /app/backend/

# Copy the best.pt model from root into the backend folder 
# because backend/app/config.py expects it at "best.pt" relative to backend/
COPY best.pt /app/backend/best.pt

# Change the active working directory for running the backend
WORKDIR /app/backend

# Expose port 8000 for FastAPI + Web UI
EXPOSE 8000

# Start the uvicorn server serving the FastAPI app on port 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
