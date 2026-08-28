import os
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader


def load_pdf(path: str) -> List[Document]:
    """
    Load PDF document and extract pages with metadata.
    
    Args:
        path (str): File system path to the PDF document.
        
    Returns:
        List[Document]: List of LangChain Document objects with page content and metadata.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"PDF file not found at: {path}")
    
    loader = PyPDFLoader(path)
    docs = loader.load()
    
    filename = os.path.basename(path)
    for idx, doc in enumerate(docs):
        if "page" not in doc.metadata:
            doc.metadata["page"] = idx + 1
        else:
            # 1-indexed page number for human readability
            doc.metadata["page"] = int(doc.metadata["page"]) + 1
        doc.metadata["source_file"] = filename

    return docs
