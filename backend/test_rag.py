import os
import sys
from dotenv import load_dotenv
from langchain_core.documents import Document

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from src.splitter import split_documents
from src.embeddings import get_embeddings
from src.vector_db import create_vector_store
from src.hybrid_search import HybridRetriever
from src.reranker import rerank_documents
from src.rag_chain import get_llm, format_context_from_parents, build_rag_prompt

load_dotenv()

def run_tests():
    print("=== 1. Testing Parent-Child Document Splitting ===")
    sample_docs = [
        Document(
            page_content=(
                "Artificial Intelligence (AI) and Machine Learning (ML) have revolutionized software systems. "
                "Retrieval-Augmented Generation (RAG) is a powerful architecture that combines information retrieval "
                "with large language models (LLMs). RAG enables models to access external proprietary or dynamically "
                "updated knowledge bases without fine-tuning. "
                "In traditional RAG pipelines, dense embeddings are generated using models like sentence-transformers. "
                "However, dense retrieval can struggle with rare terms, acronyms, or specific product codes. "
                "Hybrid search solves this limitation by combining dense vector search (e.g. FAISS) with sparse BM25 keyword matching. "
                "Furthermore, Cross-Encoder reranking significantly boosts precision by scoring full query-passage cross-attentions."
            ),
            metadata={"page": 1, "source_file": "ai_overview.pdf"}
        )
    ]
    
    child_docs, parent_map = split_documents(
        sample_docs,
        parent_chunk_size=400,
        parent_chunk_overlap=50,
        child_chunk_size=120,
        child_chunk_overlap=20
    )
    print(f"Parents generated: {len(parent_map)}")
    print(f"Children generated: {len(child_docs)}")
    assert len(parent_map) > 0, "Parent map should not be empty"
    assert len(child_docs) > 0, "Child docs should not be empty"
    
    print("\n=== 2. Testing HuggingFace Embeddings & FAISS Vector Store ===")
    embeddings = get_embeddings()
    vector_store = create_vector_store(child_docs, embeddings)
    print("FAISS vector store created successfully.")
    
    print("\n=== 3. Testing Hybrid Retrieval (Dense FAISS + Sparse BM25 RRF) ===")
    hybrid = HybridRetriever(child_docs, vector_store)
    query = "What solves the limitation of dense retrieval in RAG?"
    candidates = hybrid.search(query, top_k=5)
    print(f"Retrieved {len(candidates)} hybrid candidates.")
    for idx, c in enumerate(candidates):
        print(f"  [{idx+1}] Method: {c.metadata.get('retrieval_method')} | RRF: {c.metadata.get('rrf_score')} | Content: {c.page_content[:60]}...")
    assert len(candidates) > 0, "Candidates should not be empty"
    
    print("\n=== 4. Testing Cross-Encoder Reranker ===")
    reranked = rerank_documents(query, candidates, top_n=3)
    print(f"Reranked top {len(reranked)} chunks:")
    for idx, r in enumerate(reranked):
        print(f"  [{idx+1}] Score: {r.metadata.get('rerank_score')} | Rel%: {r.metadata.get('relevance_percentage')}% | Content: {r.page_content[:60]}...")
    assert len(reranked) > 0, "Reranked results should not be empty"
    
    print("\n=== 5. Testing Parent Context Resolution ===")
    parent_ctx = format_context_from_parents(reranked, parent_map)
    print("Resolved Parent Context Preview:")
    print(parent_ctx[:250] + "...")
    assert len(parent_ctx) > 0, "Parent context should not be empty"
    
    print("\n=== 6. Testing Groq LLM Invocation ===")
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        llm = get_llm(streaming=False)
        messages = build_rag_prompt(query, parent_ctx)
        response = llm.invoke(messages)
        print("Groq LLM Response:")
        print(response.content)
    else:
        print("Skipping Groq invocation (no GROQ_API_KEY set)")
        
    print("\n ALL PIPELINE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
