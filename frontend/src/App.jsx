import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ConnectionModal from './components/ConnectionModal';
import PipelineVisualizer from './components/PipelineVisualizer';
import ExportModal from './components/ExportModal';
import {
  uploadPDF,
  loadSamplePDF,
  streamChatMessage,
  resetSession,
  removeDocument,
  checkBackendHealth
} from './services/api';

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export default function App() {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('rag_session_id') || generateSessionId();
  });

  const [docInfo, setDocInfo] = useState(() => {
    const saved = localStorage.getItem('rag_doc_info');
    return saved ? JSON.parse(saved) : null;
  });

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('rag_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('rag_selected_model') || 'openai/gpt-oss-120b';
  });

  const [ragParams, setRagParams] = useState(() => {
    const saved = localStorage.getItem('rag_tuning_params');
    return saved ? JSON.parse(saved) : { topK: 15, topN: 5, temperature: 0.1 };
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);

  const abortControllerRef = useRef(null);

  // Check backend health on mount and periodically with auto-wake retry
  const verifyConnection = async () => {
    const res = await checkBackendHealth();
    setBackendConnected(res.ok);
    return res.ok;
  };

  useEffect(() => {
    let attempts = 0;
    let fastTimer = null;

    const initialCheck = async () => {
      const ok = await verifyConnection();
      if (!ok && attempts < 10) {
        attempts += 1;
        fastTimer = setTimeout(initialCheck, 3500);
      }
    };

    initialCheck();
    const interval = setInterval(verifyConnection, 30000);
    return () => {
      clearInterval(interval);
      if (fastTimer) clearTimeout(fastTimer);
    };
  }, []);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('rag_session_id', sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (docInfo) {
      localStorage.setItem('rag_doc_info', JSON.stringify(docInfo));
    } else {
      localStorage.removeItem('rag_doc_info');
    }
  }, [docInfo]);

  useEffect(() => {
    localStorage.setItem('rag_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('rag_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('rag_tuning_params', JSON.stringify(ragParams));
  }, [ragParams]);

  const handleParamsChange = (newParams) => {
    setRagParams((prev) => ({ ...prev, ...newParams }));
  };

  // Upload custom PDF file
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadPDF(file, sessionId);
      setBackendConnected(true);
      setSessionId(res.sessionId);
      setDocInfo({
        filename: res.filename,
        pageCount: res.pageCount,
        parentChunks: res.parentChunks,
        childChunks: res.childChunks,
      });

      setMessages([
        {
          id: 'welcome_' + Date.now(),
          role: 'assistant',
          content: `📄 **Successfully indexed "${res.filename}"!**\n\n- **Pages Parsed:** ${res.pageCount}\n- **Parent Chunks:** ${res.parentChunks} (high-context documents ~1200 chars)\n- **Child Chunks:** ${res.childChunks} (FAISS dense & BM25 sparse indexed vectors)\n\nYou can now ask any question about this document!`,
          sources: [],
        },
      ]);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload and index PDF document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Load built-in sample research paper
  const handleLoadSample = async () => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await loadSamplePDF(sessionId);
      setBackendConnected(true);
      setSessionId(res.sessionId);
      setDocInfo({
        filename: res.filename,
        pageCount: res.pageCount,
        parentChunks: res.parentChunks,
        childChunks: res.childChunks,
      });

      setMessages([
        {
          id: 'sample_' + Date.now(),
          role: 'assistant',
          content: `✨ **Loaded Sample Document: "${res.filename}"**\n\n- **Architecture:** Parent-Child Chunking + Hybrid FAISS/BM25 Fusion + Cross-Encoder Reranking\n- **Parent Chunks:** ${res.parentChunks}\n- **Child Chunks:** ${res.childChunks}\n\nTry asking: *"What are the core components of this RAG pipeline?"* or click any of the prompt suggestions below!`,
          sources: [],
        },
      ]);
    } catch (err) {
      console.error('Sample load failed:', err);
      setUploadError(err.message || 'Failed to load sample document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove active PDF document from memory
  const handleRemovePDF = async () => {
    if (!docInfo) return;
    const removedName = docInfo.filename;
    try {
      await removeDocument(sessionId);
    } catch (e) {
      console.warn('Remove document API error:', e);
    }
    setDocInfo(null);
    localStorage.removeItem('rag_doc_info');
    setMessages((prev) => [
      ...prev,
      {
        id: 'removed_' + Date.now(),
        role: 'assistant',
        content: `🗑️ **"${removedName}" has been removed from active memory.**\n\nYou can now drag and drop a new PDF, or click **"Try Sample PDF"** to ingest another document.`,
        sources: [],
      },
    ]);
  };

  // Send query and stream answer
  const handleSendMessage = async (text) => {
    if (!text.trim() || isStreaming) return;

    const userMessageId = 'msg_' + Date.now();
    const botMessageId = 'msg_' + (Date.now() + 1);

    const newMessages = [
      ...messages,
      { id: userMessageId, role: 'user', content: text },
      { id: botMessageId, role: 'assistant', content: '', sources: [], isStreaming: true },
    ];

    setMessages(newMessages);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    let accumulatedContent = '';

    await streamChatMessage({
      message: text,
      sessionId,
      topK: ragParams.topK,
      topN: ragParams.topN,
      temperature: ragParams.temperature,
      model: selectedModel,
      signal: abortControllerRef.current.signal,
      onSources: (sources) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, sources } : msg
          )
        );
      },
      onToken: (token) => {
        accumulatedContent += token;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? { ...msg, content: accumulatedContent, isStreaming: true }
              : msg
          )
        );
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
        setIsStreaming(false);
      },
      onError: (error) => {
        console.error('Streaming error:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  content:
                    accumulatedContent ||
                    `⚠️ **Error:** ${error.message || 'An error occurred while generating the answer.'}`,
                  isStreaming: false,
                }
              : msg
          )
        );
        setIsStreaming(false);
      },
    });
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
      );
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleClearSession = async () => {
    if (window.confirm('Reset all indexed documents and conversation history?')) {
      try {
        await resetSession(sessionId);
      } catch (e) {
        console.warn('Session reset call:', e);
      }
      const newId = generateSessionId();
      setSessionId(newId);
      setDocInfo(null);
      setMessages([]);
      localStorage.removeItem('rag_session_id');
      localStorage.removeItem('rag_doc_info');
      localStorage.removeItem('rag_chat_messages');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#05070f] text-slate-100 font-sans bg-radial-mesh bg-tech-grid">
      {/* Left Sidebar */}
      <Sidebar
        docInfo={docInfo}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        onLoadSample={handleLoadSample}
        onRemovePDF={handleRemovePDF}
        onClearSession={handleClearSession}
        uploadError={uploadError}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPipeline={() => setPipelineOpen(true)}
        ragParams={ragParams}
        onParamsChange={handleParamsChange}
      />

      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activePdf={docInfo?.filename}
          docInfo={docInfo}
          messageCount={messages.length}
          onClearChat={handleClearChat}
          backendConnected={backendConnected}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenPipeline={() => setPipelineOpen(true)}
          onOpenExport={() => setExportOpen(true)}
          onLoadSample={handleLoadSample}
          onRemovePDF={handleRemovePDF}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isUploading={isUploading}
        />

        <ChatWindow
          messages={messages}
          activePdf={docInfo?.filename}
          docInfo={docInfo}
          onSuggestionClick={handleSendMessage}
          onLoadSample={handleLoadSample}
          onOpenPipeline={() => setPipelineOpen(true)}
          isUploading={isUploading}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStream={handleStopStream}
          disabled={!docInfo}
          activePdf={docInfo?.filename}
          onLoadSample={handleLoadSample}
        />
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConnectionChanged={verifyConnection}
      />

      {/* Pipeline Architecture Visualizer Modal */}
      <PipelineVisualizer
        isOpen={pipelineOpen}
        onClose={() => setPipelineOpen(false)}
        docInfo={docInfo}
        ragParams={ragParams}
      />

      {/* Export Conversation Modal */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        messages={messages}
        docInfo={docInfo}
      />
    </div>
  );
}
