import os
from typing import List, Optional, Tuple
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings


def create_vector_store(
    chunks: List[Document],
    embeddings: HuggingFaceEmbeddings
) -> FAISS:
    """
    Create a FAISS vector store from document chunks.
    
    Args:
        chunks (List[Document]): Child document chunks to embed.
        embeddings (HuggingFaceEmbeddings): Initialized embeddings model.
        
    Returns:
        FAISS: In-memory FAISS vector database.
    """
    if not chunks:
        raise ValueError("Cannot create vector store from empty chunks list.")
    
    db = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )
    return db


def save_vector_store(db: FAISS, folder_path: str = "vectorstore/faiss_index") -> None:
    """
    Save FAISS index to disk.
    
    Args:
        db (FAISS): FAISS vector database.
        folder_path (str): Directory where index should be saved.
    """
    os.makedirs(folder_path, exist_ok=True)
    db.save_local(folder_path)


def load_vector_store(
    embeddings: HuggingFaceEmbeddings,
    folder_path: str = "vectorstore/faiss_index"
) -> Optional[FAISS]:
    """
    Load FAISS index from disk if available.
    
    Args:
        embeddings (HuggingFaceEmbeddings): Embeddings model used for the index.
        folder_path (str): Directory containing FAISS index.
        
    Returns:
        Optional[FAISS]: Loaded FAISS vector store or None if path doesn't exist.
    """
    if not os.path.exists(folder_path):
        return None
    return FAISS.load_local(
        folder_path=folder_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True
    )
