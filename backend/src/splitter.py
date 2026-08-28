import uuid
from typing import List, Dict, Tuple
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_documents(
    docs: List[Document],
    parent_chunk_size: int = 1200,
    parent_chunk_overlap: int = 150,
    child_chunk_size: int = 300,
    child_chunk_overlap: int = 50
) -> Tuple[List[Document], Dict[str, Document]]:
    """
    Splits documents into Parent-Child hierarchy.
    - Parent chunks: Large chunks that preserve comprehensive context for LLM response generation.
    - Child chunks: Small chunks embedded for high-precision similarity and BM25 keyword retrieval.
    
    Args:
        docs (List[Document]): Original loaded document pages.
        parent_chunk_size (int): Character size for parent chunks (default: 1200).
        parent_chunk_overlap (int): Overlap between parent chunks (default: 150).
        child_chunk_size (int): Character size for child chunks (default: 300).
        child_chunk_overlap (int): Overlap between child chunks (default: 50).
        
    Returns:
        Tuple[List[Document], Dict[str, Document]]:
            - List of child Document objects with metadata linking back to parents.
            - Dictionary mapping parent_id -> parent Document object.
    """
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=parent_chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=child_chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    parent_docs: List[Document] = parent_splitter.split_documents(docs)
    
    parent_map: Dict[str, Document] = {}
    child_docs: List[Document] = []
    
    for p_idx, p_doc in enumerate(parent_docs):
        parent_id = f"parent_{uuid.uuid4().hex[:8]}_{p_idx}"
        p_doc.metadata["parent_id"] = parent_id
        parent_map[parent_id] = p_doc
        
        # Generate smaller child chunks from this parent chunk
        sub_docs = child_splitter.split_text(p_doc.page_content)
        
        for c_idx, sub_text in enumerate(sub_docs):
            child_id = f"{parent_id}_child_{c_idx}"
            child_metadata = {
                **p_doc.metadata,
                "child_id": child_id,
                "parent_id": parent_id,
                "child_index": c_idx,
                "parent_content": p_doc.page_content,
                "page": p_doc.metadata.get("page", 1),
                "source_file": p_doc.metadata.get("source_file", "unknown.pdf")
            }
            child_docs.append(Document(page_content=sub_text, metadata=child_metadata))
            
    return child_docs, parent_map
