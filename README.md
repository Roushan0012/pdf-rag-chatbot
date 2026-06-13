# PDF RAG Chatbot

An AI-powered PDF Question Answering System built using:

* LangChain
* Groq LLM
* FAISS
* HuggingFace Embeddings
* Streamlit

## Features

* Upload PDF from UI
* Ask questions about documents
* Retrieval-Augmented Generation (RAG)
* Conversational interface
* Context-aware answers

## Installation

```bash
git clone <repo-url>
cd pdf-rag-chatbot

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=your_api_key
```

Run:

```bash
python -m streamlit run streamlit_app.py
```
