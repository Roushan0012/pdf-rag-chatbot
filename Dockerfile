FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for build tools and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies with CPU-only PyTorch for fast builds
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application files
COPY backend /app/backend
COPY app.py /app/app.py

ENV PORT=5001
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120", "backend.app:app"]
