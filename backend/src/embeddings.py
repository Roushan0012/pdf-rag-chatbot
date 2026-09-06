import os
from typing import Optional
from langchain_huggingface import HuggingFaceEmbeddings

# Set torch threads to 1 to minimize memory footprint on cloud containers (Render / Docker)
try:
    import torch
    torch.set_num_threads(1)
except Exception:
    pass

_cached_embeddings: Optional[HuggingFaceEmbeddings] = None


def get_embeddings(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> HuggingFaceEmbeddings:
    """
    Get or initialize HuggingFace embeddings model with memory optimization.
    Caches the instance to avoid expensive reloading.
    """
    global _cached_embeddings
    if _cached_embeddings is None:
        _cached_embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True, "batch_size": 16}
        )
    return _cached_embeddings
