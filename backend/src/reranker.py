import math
from typing import List, Optional
from sentence_transformers import CrossEncoder
from langchain_core.documents import Document

_cached_cross_encoder: Optional[CrossEncoder] = None


def get_cross_encoder(model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2") -> CrossEncoder:
    """
    Get or initialize CrossEncoder model instance with singleton caching.
    
    Args:
        model_name (str): HuggingFace CrossEncoder model name.
        
    Returns:
        CrossEncoder: Initialized CrossEncoder model.
    """
    global _cached_cross_encoder
    if _cached_cross_encoder is None:
        _cached_cross_encoder = CrossEncoder(model_name)
    return _cached_cross_encoder


def rerank_documents(
    query: str,
    documents: List[Document],
    top_n: int = 5,
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
) -> List[Document]:
    """
    Reranks candidate documents against the query using a Cross-Encoder model.
    
    Args:
        query (str): The search query or question.
        documents (List[Document]): Candidate retrieved chunks (e.g. top 15 from hybrid search).
        top_n (int): Number of top ranked documents to return (default: 5).
        model_name (str): Model identifier for CrossEncoder.
        
    Returns:
        List[Document]: Top N reranked documents with rerank_score and relevance percentage.
    """
    if not documents:
        return []
    
    if len(documents) <= 1:
        return documents[:top_n]
    
    model = get_cross_encoder(model_name)
    
    # Prepare query-passage pairs
    pairs = [[query, doc.page_content] for doc in documents]
    scores = model.predict(pairs)
    
    scored_docs: List[Document] = []
    for doc, score in zip(documents, scores):
        new_meta = dict(doc.metadata)
        raw_score = float(score)
        new_meta["rerank_score"] = round(raw_score, 4)
        
        # Calculate sigmoid normalized relevance percentage (0-100%)
        # Sigmoid: 1 / (1 + exp(-x))
        try:
            norm_prob = 1.0 / (1.0 + math.exp(-raw_score))
            new_meta["relevance_percentage"] = round(norm_prob * 100, 1)
        except OverflowError:
            new_meta["relevance_percentage"] = 100.0 if raw_score > 0 else 0.0
            
        scored_docs.append(Document(page_content=doc.page_content, metadata=new_meta))
        
    # Sort descending by rerank_score
    scored_docs.sort(key=lambda d: d.metadata.get("rerank_score", 0.0), reverse=True)
    
    return scored_docs[:top_n]
