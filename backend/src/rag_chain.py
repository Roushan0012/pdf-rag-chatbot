import os
from typing import List, Dict, Optional, Any, Union
from dotenv import load_dotenv

try:
    from langchain_groq import ChatGroq  # type: ignore
except ImportError:
    ChatGroq = None  # type: ignore

from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langchain_core.documents import Document

load_dotenv()


def get_llm(
    model: Optional[str] = None,
    temperature: float = 0.1,
    streaming: bool = True
) -> ChatGroq:
    """
    Initialize Groq Chat LLM client.
    
    Args:
        model (Optional[str]): Groq LLM model name (defaults to GROQ_MODEL env var or openai/gpt-oss-120b).
        temperature (float): Temperature for sampling (default: 0.1).
        streaming (bool): Whether to enable streaming responses.
        
    Returns:
        ChatGroq: Initialized LangChain Groq model.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set. Please set it in .env.")
    
    selected_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    
    return ChatGroq(
        model=selected_model,
        temperature=temperature,
        streaming=streaming,
        groq_api_key=api_key
    )


def format_context_from_parents(
    retrieved_chunks: List[Document],
    parent_map: Dict[str, Document]
) -> str:
    """
    Formats the context by resolving child chunks to their full Parent documents,
    deduplicating parent chunks while preserving order.
    
    Args:
        retrieved_chunks (List[Document]): Top reranked child chunks.
        parent_map (Dict[str, Document]): Registry mapping parent_id -> parent Document.
        
    Returns:
        str: Cleanly structured markdown context string with source references.
    """
    seen_parents = set()
    context_blocks: List[str] = []
    
    for i, child in enumerate(retrieved_chunks):
        parent_id = child.metadata.get("parent_id")
        page = child.metadata.get("page", 1)
        source = child.metadata.get("source_file", "Document")
        
        # Check if parent is available in registry or directly in metadata
        if parent_id and parent_id in parent_map:
            parent_doc = parent_map[parent_id]
            if parent_id in seen_parents:
                continue
            seen_parents.add(parent_id)
            content = parent_doc.page_content.strip()
        else:
            content = child.metadata.get("parent_content", child.page_content).strip()
            if content in seen_parents:
                continue
            seen_parents.add(content)
            
        context_blocks.append(
            f"[Source {len(context_blocks) + 1} | File: {source} | Page: {page}]\n{content}"
        )
        
    return "\n\n---\n\n".join(context_blocks)


def build_rag_prompt(
    query: str,
    context: str,
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> List[BaseMessage]:
    """
    Builds system and human messages for the Groq LLM.
    """
    system_prompt = (
        "You are an expert AI Research Assistant specializing in analyzing PDF documents.\n"
        "Your task is to provide comprehensive, accurate, and direct answers based on the provided document context.\n\n"
        "GUIDELINES:\n"
        "1. Strictly ground your answer in the provided context.\n"
        "2. If the context does not contain enough information to answer the question, state: "
        "'I couldn't find that specific information in the uploaded document.' and offer what related info is available.\n"
        "3. Use clean Markdown formatting with clear headings, bullet points, and code blocks where appropriate.\n"
        "4. When referencing specific facts, cite the source number or page (e.g., '[Page 2]').\n"
        "5. Be concise yet thorough, professional, and well-structured."
    )
    
    history_text = ""
    if conversation_history and len(conversation_history) > 0:
        history_lines = []
        for msg in conversation_history[-6:]:  # Last 3 turns
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_lines.append(f"{role}: {msg.get('content', '')}")
        history_text = "\n\nPrior Conversation:\n" + "\n".join(history_lines)

    user_prompt = f"""Context from Document:
{context}
{history_text}

User Question:
{query}

Please provide a structured, detailed, and directly cited answer:"""

    return [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
