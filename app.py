from src.embeddings import get_embeddings
from src.vector_db import load_vector_store
from src.rag_chain import get_llm

embeddings = get_embeddings()

db = load_vector_store(embeddings)

retriever = db.as_retriever(
    search_kwargs={"k": 3}
)

llm = get_llm()

print("RAG Chatbot Ready!")
print("Type exit to quit.\n")

while True:
    question = input("You: ")

    if question.lower() == "exit":
        break

    docs = retriever.invoke(question)

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
Answer the question only from the given context.

Context:
{context}

Question:
{question}
"""

    response = llm.invoke(prompt)

    print("\nBot:", response.content)
    print()