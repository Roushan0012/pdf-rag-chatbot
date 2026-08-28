import re
from typing import List, Dict, Any, Tuple, Optional
try:
    from rank_bm25 import BM25Okapi  # type: ignore
except ImportError:
    BM25Okapi = None  # type: ignore

from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS


class HybridRetriever:
    """
    Hybrid Retriever combining FAISS dense vector similarity with BM25 sparse keyword matching
    using Reciprocal Rank Fusion (RRF).
    """

    def __init__(self, child_docs: List[Document], vector_store: FAISS):
        """
        Initialize the hybrid retriever.
        
        Args:
            child_docs (List[Document]): All child chunks to be indexed.
            vector_store (FAISS): FAISS dense index of the child chunks.
        """
        self.child_docs: List[Document] = child_docs
        self.vector_store: FAISS = vector_store
        
        # Tokenize corpus for BM25
        self.corpus_tokens: List[List[str]] = [
            self._tokenize(doc.page_content) for doc in child_docs
        ]
        
        if BM25Okapi and self.corpus_tokens:
            self.bm25: Optional[Any] = BM25Okapi(self.corpus_tokens)
        else:
            self.bm25 = None

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Simple, fast regex tokenizer for BM25."""
        return re.findall(r"\w+", text.lower())

    def dense_search(self, query: str, k: int = 15) -> List[Tuple[Document, float]]:
        """Perform dense FAISS vector search."""
        if not self.vector_store:
            return []
        return self.vector_store.similarity_search_with_score(query, k=k)

    def sparse_search(self, query: str, k: int = 15) -> List[Tuple[Document, float]]:
        """Perform sparse BM25 keyword search."""
        if not self.bm25 or not self.child_docs:
            return []
        
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return [(doc, 0.0) for doc in self.child_docs[:k]]
        
        scores = self.bm25.get_scores(query_tokens)
        
        # Pair documents with their BM25 scores and sort descending
        doc_scores = list(zip(self.child_docs, scores))
        doc_scores.sort(key=lambda x: x[1], reverse=True)
        return doc_scores[:k]

    def search(self, query: str, top_k: int = 15, rrf_k: int = 60) -> List[Document]:
        """
        Execute hybrid search and merge candidate results using Reciprocal Rank Fusion (RRF).
        
        Args:
            query (str): User question/search query.
            top_k (int): Number of top combined candidates to return (default: 15).
            rrf_k (int): RRF constant parameter (default: 60).
            
        Returns:
            List[Document]: Top combined documents with RRF scores & retrieval provenance.
        """
        dense_results = self.dense_search(query, k=top_k)
        sparse_results = self.sparse_search(query, k=top_k)

        rrf_scores: Dict[str, float] = {}
        doc_map: Dict[str, Document] = {}
        sources_map: Dict[str, List[str]] = {}

        # Process dense ranks
        for rank, (doc, _) in enumerate(dense_results):
            doc_id = str(doc.metadata.get("child_id", doc.page_content[:50]))
            doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))
            sources_map.setdefault(doc_id, []).append("dense_faiss")

        # Process sparse ranks
        for rank, (doc, _) in enumerate(sparse_results):
            doc_id = str(doc.metadata.get("child_id", doc.page_content[:50]))
            doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))
            sources_map.setdefault(doc_id, []).append("sparse_bm25")

        # Sort by combined RRF score descending
        sorted_doc_ids = sorted(
            rrf_scores.keys(),
            key=lambda did: rrf_scores[did],
            reverse=True
        )

        final_candidates: List[Document] = []
        for did in sorted_doc_ids[:top_k]:
            doc = doc_map[did]
            new_metadata = dict(doc.metadata)
            new_metadata["rrf_score"] = round(rrf_scores[did], 6)
            sources = sources_map[did]
            if len(sources) > 1:
                new_metadata["retrieval_method"] = "hybrid"
            else:
                new_metadata["retrieval_method"] = sources[0]
            
            final_candidates.append(
                Document(page_content=doc.page_content, metadata=new_metadata)
            )

        return final_candidates
