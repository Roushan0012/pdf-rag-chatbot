import os
import sys
import json
import uuid
import logging
import tempfile
from pathlib import Path

# Ensure backend and root are in sys.path
backend_dir = Path(__file__).resolve().parent
root_dir = backend_dir.parent
for p in [str(backend_dir), str(root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from typing import Dict, Any, Optional
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env from backend directory or root directory
load_dotenv(dotenv_path=backend_dir / ".env")
load_dotenv(dotenv_path=root_dir / ".env")

try:
    from backend.src.loader import load_pdf
    from backend.src.splitter import split_documents
    from backend.src.embeddings import get_embeddings
    from backend.src.vector_db import create_vector_store
    from backend.src.hybrid_search import HybridRetriever
    from backend.src.reranker import rerank_documents
    from backend.src.rag_chain import get_llm, format_context_from_parents, build_rag_prompt
except ImportError:
    from src.loader import load_pdf  # type: ignore
    from src.splitter import split_documents  # type: ignore
    from src.embeddings import get_embeddings  # type: ignore
    from src.vector_db import create_vector_store  # type: ignore
    from src.hybrid_search import HybridRetriever  # type: ignore
    from src.reranker import rerank_documents  # type: ignore
    from src.rag_chain import get_llm, format_context_from_parents, build_rag_prompt  # type: ignore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rag_api")

app = Flask(__name__)
# Enable CORS for frontend clients
CORS(app, resources={r"/api/*": {"origins": "*"}})

# In-memory session store: session_id -> session data
# In production, this can be backed by Redis or persistent cache
sessions: Dict[str, Dict[str, Any]] = {}


def get_or_create_session(session_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve existing session or instantiate a new one."""
    if not session_id or session_id not in sessions:
        new_id = session_id or str(uuid.uuid4())
        sessions[new_id] = {
            "session_id": new_id,
            "filename": None,
            "page_count": 0,
            "parent_chunks_count": 0,
            "child_chunks_count": 0,
            "hybrid_retriever": None,
            "parent_map": {},
            "messages": []
        }
        return sessions[new_id]
    return sessions[session_id]


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    groq_configured = bool(os.getenv("GROQ_API_KEY"))
    return jsonify({
        "status": "healthy",
        "service": "PDF RAG Chatbot Flask API",
        "groq_configured": groq_configured,
        "active_sessions": len(sessions)
    }), 200


@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    """
    Endpoint for PDF ingestion, parent-child chunking, and hybrid indexing.
    Accepts: multipart/form-data with 'file' and optional 'sessionId'.
    """
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
        
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400
        
        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400
        
        session_id = request.form.get("sessionId")
        session = get_or_create_session(session_id)
        current_session_id = session["session_id"]
        
        logger.info(f"Processing PDF '{file.filename}' for session {current_session_id}")
        
        # Save temporary file safely
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
            
        try:
            # 1. Load document pages with page numbering metadata
            docs = load_pdf(tmp_path)
            # Retain original uploaded filename in metadata
            for doc in docs:
                doc.metadata["source_file"] = file.filename
                
            page_count = len(docs)
            logger.info(f"Loaded {page_count} pages from {file.filename}")
            
            # 2. Parent-Child splitting
            child_chunks, parent_map = split_documents(
                docs,
                parent_chunk_size=1200,
                parent_chunk_overlap=150,
                child_chunk_size=300,
                child_chunk_overlap=50
            )
            logger.info(f"Generated {len(parent_map)} parent chunks and {len(child_chunks)} child chunks")
            
            # 3. Dense FAISS indexing
            embeddings = get_embeddings()
            vector_store = create_vector_store(child_chunks, embeddings)
            
            # 4. Hybrid Retriever (FAISS Dense + BM25 Sparse)
            hybrid_retriever = HybridRetriever(child_chunks, vector_store)
            
            # Update session
            session["filename"] = file.filename
            session["page_count"] = page_count
            session["parent_chunks_count"] = len(parent_map)
            session["child_chunks_count"] = len(child_chunks)
            session["hybrid_retriever"] = hybrid_retriever
            session["parent_map"] = parent_map
            session["messages"] = []  # reset history for new doc
            
            return jsonify({
                "success": True,
                "sessionId": current_session_id,
                "filename": file.filename,
                "pageCount": page_count,
                "parentChunks": len(parent_map),
                "childChunks": len(child_chunks),
                "message": f"Successfully indexed '{file.filename}'"
            }), 200
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        logger.exception("Error during PDF processing")
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    RAG Chat endpoint. Supports streaming (Server-Sent Events) and non-streaming modes.
    Accepts JSON:
    {
        "message": "User query",
        "sessionId": "UUID",
        "stream": true/false (default true)
    }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
        
        query = data.get("message", "").strip()
        session_id = data.get("sessionId")
        stream_enabled = data.get("stream", True)
        
        if not query:
            return jsonify({"error": "Message query is required"}), 400
        
        if not session_id or session_id not in sessions:
            return jsonify({"error": "Active session not found. Please upload a PDF first."}), 404
        
        session = sessions[session_id]
        hybrid_retriever: Optional[HybridRetriever] = session.get("hybrid_retriever")
        parent_map: Dict[str, Any] = session.get("parent_map", {})
        
        if not hybrid_retriever:
            return jsonify({"error": "No document is currently indexed for this session."}), 400
        
        logger.info(f"Session {session_id} - Query: {query}")
        
        # Step 1: Hybrid Retrieval (Dense FAISS + Sparse BM25 -> Top 15)
        candidate_chunks = hybrid_retriever.search(query, top_k=15)
        logger.info(f"Retrieved {len(candidate_chunks)} candidates from hybrid search")
        
        # Step 2: Cross-Encoder Reranking (Top 15 -> Top 5)
        reranked_chunks = rerank_documents(query, candidate_chunks, top_n=5)
        logger.info(f"Reranked to top {len(reranked_chunks)} chunks")
        
        # Step 3: Resolve Parent Context
        formatted_context = format_context_from_parents(reranked_chunks, parent_map)
        
        # Prepare serializable sources metadata for the UI
        sources_payload = []
        for i, chunk in enumerate(reranked_chunks):
            p_id = chunk.metadata.get("parent_id", "")
            parent_text = parent_map.get(p_id).page_content if p_id in parent_map else chunk.metadata.get("parent_content", "")
            
            sources_payload.append({
                "id": i + 1,
                "childId": chunk.metadata.get("child_id", f"c_{i}"),
                "childContent": chunk.page_content,
                "parentContent": parent_text,
                "page": chunk.metadata.get("page", 1),
                "sourceFile": chunk.metadata.get("source_file", session.get("filename", "document.pdf")),
                "rerankScore": chunk.metadata.get("rerank_score", 0.0),
                "relevancePercentage": chunk.metadata.get("relevance_percentage", 50.0),
                "retrievalMethod": chunk.metadata.get("retrieval_method", "hybrid"),
                "rrfScore": chunk.metadata.get("rrf_score", 0.0)
            })
            
        # Build prompt messages
        messages = build_rag_prompt(
            query=query,
            context=formatted_context,
            conversation_history=session.get("messages", [])
        )
        
        llm = get_llm(streaming=stream_enabled)
        
        # Record user query in history
        session.setdefault("messages", []).append({"role": "user", "content": query})
        
        if stream_enabled:
            def generate_stream():
                full_bot_response = []
                try:
                    # First event: Send retrieved sources metadata
                    yield f"event: sources\ndata: {json.dumps(sources_payload)}\n\n"
                    
                    # Stream tokens from Groq
                    for chunk in llm.stream(messages):
                        token = chunk.content
                        if token:
                            full_bot_response.append(token)
                            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                    
                    # Complete response
                    complete_text = "".join(full_bot_response)
                    session["messages"].append({"role": "assistant", "content": complete_text})
                    yield f"event: done\ndata: {json.dumps({'done': True, 'totalLength': len(complete_text)})}\n\n"
                    
                except Exception as stream_err:
                    logger.exception("Error during LLM streaming")
                    yield f"event: error\ndata: {json.dumps({'error': str(stream_err)})}\n\n"
            
            return Response(
                stream_with_context(generate_stream()),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no"
                }
            )
        else:
            # Non-streaming response
            response = llm.invoke(messages)
            answer = response.content
            session["messages"].append({"role": "assistant", "content": answer})
            
            return jsonify({
                "response": answer,
                "sources": sources_payload,
                "sessionId": session_id
            }), 200

    except Exception as e:
        logger.exception("Error in /api/chat route")
        return jsonify({"error": f"Chat processing failed: {str(e)}"}), 500


@app.route("/api/session/<session_id>", methods=["GET"])
def get_session_info(session_id: str):
    """Retrieve metadata about the current session."""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    
    session = sessions[session_id]
    return jsonify({
        "sessionId": session_id,
        "filename": session.get("filename"),
        "pageCount": session.get("page_count", 0),
        "parentChunks": session.get("parent_chunks_count", 0),
        "childChunks": session.get("child_chunks_count", 0),
        "messageCount": len(session.get("messages", [])),
        "isReady": session.get("hybrid_retriever") is not None
    }), 200


@app.route("/api/session/<session_id>", methods=["DELETE"])
def clear_session(session_id: str):
    """Clear and reset session memory."""
    if session_id in sessions:
        del sessions[session_id]
    return jsonify({"success": True, "message": "Session reset successfully"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    logger.info(f"Starting Flask RAG server on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
