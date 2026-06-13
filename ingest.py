from src.loader import load_pdf
from src.splitter import split_documents
from src.embeddings import get_embeddings
from src.vector_db import create_vector_store

print("Loading PDF...")

docs = load_pdf("data/IIIT_Bhagalpur_Resume_Official.pdf")

print("Splitting...")

chunks = split_documents(docs)

print(f"Chunks created: {len(chunks)}")

embeddings = get_embeddings()

create_vector_store(
    chunks,
    embeddings
)

print("Vector DB Created Successfully!")