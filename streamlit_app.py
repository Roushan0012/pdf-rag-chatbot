import streamlit as st
import tempfile
import os

from src.loader import load_pdf
from src.splitter import split_documents
from src.embeddings import get_embeddings
from src.vector_db import create_vector_store
from src.rag_chain import get_llm

# =====================================================
# PAGE CONFIG
# =====================================================

st.set_page_config(
    page_title="PDF RAG Chatbot",
    page_icon="🤖",
    layout="wide"
)

# =====================================================
# CSS
# =====================================================

st.markdown("""
<style>

.main {
    padding-top: 1rem;
}

[data-testid="stSidebar"] {
    background: linear-gradient(
        180deg,
        #071329,
        #0B1E3D
    );
}

[data-testid="stSidebar"] * {
    color: white;
}

.chat-title {
    text-align: center;
    font-size: 42px;
    font-weight: bold;
}

[data-testid="stFileUploader"] {
    background-color: #1E293B;
    border: 2px dashed #3B82F6;
    border-radius: 20px;
    padding: 20px;
}

[data-testid="stFileUploaderDropzone"] {
    background-color: #1E293B;
    border: none;
    min-height: 180px;
}

[data-testid="stFileUploader"] button {
    background-color: #2563EB !important;
    color: white !important;
    border-radius: 12px !important;
    font-weight: bold !important;
}

[data-testid="stFileUploader"] button:hover {
    background-color: #1D4ED8 !important;
}

</style>
""", unsafe_allow_html=True)

# =====================================================
# SESSION STATE
# =====================================================

if "messages" not in st.session_state:
    st.session_state.messages = []

if "retriever" not in st.session_state:
    st.session_state.retriever = None

if "llm" not in st.session_state:
    st.session_state.llm = None

if "current_pdf" not in st.session_state:
    st.session_state.current_pdf = None

# =====================================================
# SIDEBAR
# =====================================================

with st.sidebar:

    st.title("🤖 AI PDF Assistant")

    st.markdown("---")

    st.markdown(
        """
        <div style='text-align:center;font-size:70px;'>
            📄
        </div>
        <h3 style='text-align:center;'>
            Upload PDF
        </h3>
        """,
        unsafe_allow_html=True
    )

    uploaded_file = st.file_uploader(
        "",
        type=["pdf"],
        label_visibility="collapsed"
    )

    if uploaded_file:
        st.success(f"✅ {uploaded_file.name}")

    st.markdown("---")

    st.markdown("""
    ### 🚀 Features

    ✅ Upload PDF

    ✅ Groq LLM

    ✅ LangChain

    ✅ HuggingFace Embeddings

    ✅ FAISS Retrieval

    ✅ Conversational Chat
    """)

# =====================================================
# TITLE
# =====================================================

st.markdown(
    """
    <div class="chat-title">
        🤖 PDF RAG CHATBOT
    </div>
    """,
    unsafe_allow_html=True
)

st.caption("Upload a PDF and start asking questions.")

# =====================================================
# PROCESS PDF
# =====================================================

if uploaded_file is not None:

    if st.session_state.current_pdf != uploaded_file.name:

        with st.spinner("Processing PDF..."):

            temp_dir = tempfile.mkdtemp()

            pdf_path = os.path.join(
                temp_dir,
                uploaded_file.name
            )

            with open(pdf_path, "wb") as f:
                f.write(uploaded_file.getbuffer())

            docs = load_pdf(pdf_path)

            chunks = split_documents(docs)

            embeddings = get_embeddings()

            db = create_vector_store(
                chunks,
                embeddings
            )

            retriever = db.as_retriever(
                search_kwargs={"k": 3}
            )

            llm = get_llm()

            st.session_state.retriever = retriever
            st.session_state.llm = llm
            st.session_state.current_pdf = uploaded_file.name

            st.success("✅ PDF Processed Successfully")

# =====================================================
# NO PDF UPLOADED
# =====================================================

if st.session_state.retriever is None:

    st.info(
        "👈 Upload a PDF from the sidebar to begin chatting."
    )

    st.stop()

# =====================================================
# CURRENT PDF
# =====================================================

st.success(
    f"📄 Current PDF: {st.session_state.current_pdf}"
)

# =====================================================
# CHAT HISTORY
# =====================================================

for message in st.session_state.messages:

    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# =====================================================
# USER INPUT
# =====================================================

question = st.chat_input(
    "Ask something about the PDF..."
)

if question:

    st.session_state.messages.append(
        {
            "role": "user",
            "content": question
        }
    )

    with st.chat_message("user"):
        st.markdown(question)

    docs = st.session_state.retriever.invoke(
        question
    )

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
You are a helpful AI assistant.

Answer ONLY using the provided context.

If the answer does not exist in the document,
say:
"I couldn't find that information in the document."

Context:
{context}

Question:
{question}
"""

    with st.chat_message("assistant"):

        with st.spinner("Thinking..."):

            response = st.session_state.llm.invoke(
                prompt
            )

            answer = response.content

            st.markdown(answer)

    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": answer
        }
    )

    with st.expander("📚 Retrieved Context"):

        for i, doc in enumerate(docs):

            st.markdown(
                f"### Chunk {i+1}"
            )

            st.write(
                doc.page_content[:1000]
            )

            st.markdown("---")