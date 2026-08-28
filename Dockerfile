FROM python:3.11-slim

WORKDIR /app

# Set memory-saving environment variables for PyTorch and Transformers
ENV PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    TOKENIZERS_PARALLELISM=false \
    PORT=10000

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch (much smaller memory footprint) and backend requirements
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application files
COPY backend /app/backend
COPY app.py /app/app.py

EXPOSE 10000

# Run with 1 worker to stay well under Render 512MB RAM free limit, dynamic PORT binding
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 4 --timeout 120 backend.app:app"]
