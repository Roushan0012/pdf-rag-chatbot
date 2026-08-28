from typing import Optional
from langchain_huggingface import HuggingFaceEmbeddings

_cached_embeddings: Optional[HuggingFaceEmbeddings] = None


def get_embeddings(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> HuggingFaceEmbeddings:
    """
    Get or initialize HuggingFace embeddings model.
    Caches the instance to avoid expensive reloading.
    
    Args:
        model_name (str): HuggingFace embedding model name.
        
    Returns:
        HuggingFaceEmbeddings: Initialized embeddings provider.
    """
    global _cached_embeddings
    if _cached_embeddings is None:
        _cached_embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
    return _cached_embeddings
