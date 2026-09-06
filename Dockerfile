FROM python:3.11-slim

WORKDIR /app

# Set memory-saving environment variables for PyTorch and Transformers
ENV PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    TOKENIZERS_PARALLELISM=false \
    HF_HOME=/app/.cache/huggingface \
    PORT=10000

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch and backend requirements
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt gunicorn

# Pre-download models to cache during container build for instant zero-wait execution
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# Copy application files and sample dataset
COPY backend /app/backend
COPY app.py /app/app.py
COPY sample_rag_paper.pdf /app/sample_rag_paper.pdf

EXPOSE 10000

# Run with 1 worker to stay well within Render 512MB RAM free limit with 300s timeout
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 4 --timeout 300 backend.app:app"]
