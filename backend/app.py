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

import gc
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify, Response, stream_with_context, send_from_directory
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
    from backend.src.reranker import rerank_documents, get_cross_encoder
    from backend.src.rag_chain import get_llm, format_context_from_parents, build_rag_prompt
except ImportError:
    from src.loader import load_pdf  # type: ignore
    from src.splitter import split_documents  # type: ignore
    from src.embeddings import get_embeddings  # type: ignore
    from src.vector_db import create_vector_store  # type: ignore
    from src.hybrid_search import HybridRetriever  # type: ignore
    from src.reranker import rerank_documents, get_cross_encoder  # type: ignore
    from src.rag_chain import get_llm, format_context_from_parents, build_rag_prompt  # type: ignore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rag_api")

app = Flask(__name__)
# Enable CORS for all frontend clients
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Pre-warm models so first upload/query is instantaneous
try:
    logger.info("Pre-warming Embedding and Cross-Encoder models in memory...")
    get_embeddings()
    get_cross_encoder()
    gc.collect()
    logger.info("Models pre-warmed successfully!")
except Exception as _e:
    logger.warning(f"Model warm-up note: {_e}")

# In-memory session store: session_id -> session data
sessions: Dict[str, Dict[str, Any]] = {}

# Background keep-alive daemon thread to prevent Render container from sleeping
import threading
import time
import urllib.request

def _keep_alive_worker():
    """Periodically ping public health endpoint every 9.5 minutes to prevent idle sleep."""
    time.sleep(90)
    while True:
        try:
            render_url = os.environ.get("RENDER_EXTERNAL_URL") or "https://pdf-rag-chatbot-3-yw6u.onrender.com"
            if render_url:
                target = f"{render_url.rstrip('/')}/api/health"
                req = urllib.request.Request(target, headers={"User-Agent": "NexusRAGKeepAlive/1.0"})
                with urllib.request.urlopen(req, timeout=20) as res:
                    logger.info(f"Keep-alive self-ping to {target} returned status {res.status}")
        except Exception as _ping_err:
            logger.debug(f"Keep-alive ping note: {_ping_err}")
        time.sleep(570)  # every 9.5 minutes (Render sleep timeout is 15 minutes)

threading.Thread(target=_keep_alive_worker, daemon=True).start()


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


def process_and_index_document(file_path: str, filename: str, session: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ingest PDF, execute Parent-Child splitting, build FAISS & BM25 indexes.
    """
    docs = load_pdf(file_path)
    for doc in docs:
        doc.metadata["source_file"] = filename

    page_count = len(docs)
    logger.info(f"Loaded {page_count} pages from {filename}")

    # 1. Parent-Child splitting (High-context Parent, Searchable Child)
    child_chunks, parent_map = split_documents(
        docs,
        parent_chunk_size=1200,
        parent_chunk_overlap=150,
        child_chunk_size=300,
        child_chunk_overlap=50
    )
    logger.info(f"Generated {len(parent_map)} parent chunks and {len(child_chunks)} child chunks")

    # 2. Dense FAISS Vector Indexing
    embeddings = get_embeddings()
    vector_store = create_vector_store(child_chunks, embeddings)

    # 3. Hybrid Retriever (FAISS Dense + BM25 Sparse with Reciprocal Rank Fusion)
    hybrid_retriever = HybridRetriever(child_chunks, vector_store)

    # 4. Save to session
    session["filename"] = filename
    session["page_count"] = page_count
    session["parent_chunks_count"] = len(parent_map)
    session["child_chunks_count"] = len(child_chunks)
    session["hybrid_retriever"] = hybrid_retriever
    session["parent_map"] = parent_map
    session["messages"] = []  # reset history for new doc

    gc.collect()

    return {
        "success": True,
        "sessionId": session["session_id"],
        "filename": filename,
        "pageCount": page_count,
        "parentChunks": len(parent_map),
        "childChunks": len(child_chunks),
        "message": f"Successfully indexed '{filename}' with {len(parent_map)} parent & {len(child_chunks)} child chunks."
    }


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    groq_configured = bool(os.getenv("GROQ_API_KEY"))
    return jsonify({
        "status": "healthy",
        "service": "Enterprise PDF RAG Chatbot API",
        "groq_configured": groq_configured,
        "default_model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        "active_sessions": len(sessions)
    }), 200


@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    """
    Endpoint for PDF upload, parent-child chunking, and hybrid indexing.
    """
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part in request"}), 400
        
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.lower().endswith(".pdf"):
            return jsonify({"error": "Only PDF files are supported"}), 400
        
        session_id = request.form.get("sessionId")
        session = get_or_create_session(session_id)
        
        logger.info(f"Processing PDF '{file.filename}' for session {session['session_id']}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
            
        try:
            result = process_and_index_document(tmp_path, file.filename, session)
            return jsonify(result), 200
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        logger.exception("Error during PDF upload processing")
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


@app.route("/api/sample", methods=["POST"])
def load_sample_document():
    """
    Endpoint to load bundled sample PDF for instant testing.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        session_id = data.get("sessionId")
        session = get_or_create_session(session_id)

        sample_paths = [
            root_dir / "sample_rag_paper.pdf",
            backend_dir / "sample_rag_paper.pdf",
            Path("sample_rag_paper.pdf")
        ]
        
        found_path = None
        for p in sample_paths:
            if p.exists():
                found_path = str(p)
                break

        if not found_path:
            return jsonify({"error": "Sample PDF file not found on server"}), 404

        result = process_and_index_document(found_path, "sample_rag_paper.pdf", session)
        return jsonify(result), 200

    except Exception as e:
        logger.exception("Error loading sample document")
        return jsonify({"error": f"Failed to load sample PDF: {str(e)}"}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    RAG Chat endpoint. Supports streaming SSE and standard JSON response.
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
        
        query = data.get("message", "").strip()
        session_id = data.get("sessionId")
        stream_enabled = data.get("stream", True)
        top_k = int(data.get("topK", 15))
        top_n = int(data.get("topN", 5))
        temperature = float(data.get("temperature", 0.1))
        model_name = data.get("model")
        
        if not query:
            return jsonify({"error": "Message query is required"}), 400
        
        if not session_id or session_id not in sessions:
            return jsonify({"error": "Active session not found. Please upload a PDF first."}), 404
        
        session = sessions[session_id]
        hybrid_retriever: Optional[HybridRetriever] = session.get("hybrid_retriever")
        parent_map: Dict[str, Any] = session.get("parent_map", {})
        
        if not hybrid_retriever:
            return jsonify({"error": "No document is currently indexed for this session."}), 400
        
        logger.info(f"Session {session_id} - Query: '{query}' (top_k={top_k}, top_n={top_n})")
        
        # Step 1: Hybrid Retrieval (FAISS Dense + BM25 Sparse -> Top K)
        candidate_chunks = hybrid_retriever.search(query, top_k=top_k)
        logger.info(f"Retrieved {len(candidate_chunks)} candidates from hybrid search")
        
        # Step 2: Cross-Encoder Reranking (Top K -> Top N)
        reranked_chunks = rerank_documents(query, candidate_chunks, top_n=top_n)
        logger.info(f"Reranked to top {len(reranked_chunks)} chunks")
        
        # Step 3: Resolve Parent Context
        formatted_context = format_context_from_parents(reranked_chunks, parent_map)
        
        # Step 4: Prepare serializable sources payload
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
            
        messages = build_rag_prompt(
            query=query,
            context=formatted_context,
            conversation_history=session.get("messages", [])
        )
        
        llm = get_llm(model=model_name, temperature=temperature, streaming=stream_enabled)
        
        session.setdefault("messages", []).append({"role": "user", "content": query})
        
        if stream_enabled:
            def generate_stream():
                full_bot_response = []
                try:
                    # 1. Yield sources event
                    yield f"event: sources\ndata: {json.dumps(sources_payload)}\n\n"
                    
                    # 2. Yield token events
                    for chunk in llm.stream(messages):
                        token = chunk.content
                        if token:
                            full_bot_response.append(token)
                            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                    
                    # 3. Complete event
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
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive"
                }
            )
        else:
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
    """Retrieve session metadata."""
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
    """Reset session memory completely."""
    if session_id in sessions:
        del sessions[session_id]
    return jsonify({"success": True, "message": "Session reset successfully"}), 200


@app.route("/api/document/<session_id>", methods=["DELETE"])
def remove_document(session_id: str):
    """Remove active indexed PDF document from session."""
    if session_id in sessions:
        sessions[session_id]["filename"] = None
        sessions[session_id]["page_count"] = 0
        sessions[session_id]["parent_chunks_count"] = 0
        sessions[session_id]["child_chunks_count"] = 0
        sessions[session_id]["hybrid_retriever"] = None
        sessions[session_id]["parent_map"] = {}
    return jsonify({"success": True, "message": "Document removed successfully"}), 200


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    dist_dir = root_dir / "frontend" / "dist"
    if dist_dir.exists():
        file_path = dist_dir / path
        if path != "" and file_path.exists():
            return send_from_directory(str(dist_dir), path)
        return send_from_directory(str(dist_dir), "index.html")
    
    return jsonify({
        "status": "online",
        "service": "Enterprise PDF RAG Chatbot API",
        "message": "Frontend is running via Vite on http://localhost:5173",
        "endpoints": {
            "health": "/api/health",
            "sample_pdf": "/api/sample (POST)",
            "upload_pdf": "/api/upload (POST)",
            "chat_stream": "/api/chat (POST)"
        }
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    logger.info(f"Starting Enterprise RAG server on http://127.0.0.1:{port} (debug={debug_mode})")
    # use_reloader is set to False to avoid infinite fsevents restart loops on MacOS venv file access
    app.run(host="0.0.0.0", port=port, debug=debug_mode, use_reloader=False)
