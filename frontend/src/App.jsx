import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ConnectionModal from './components/ConnectionModal';
import { uploadPDF, streamChatMessage, resetSession, checkBackendHealth } from './services/api';

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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);

  const abortControllerRef = useRef(null);

  // Verify backend connectivity
  const verifyConnection = async () => {
    const res = await checkBackendHealth();
    setBackendConnected(res.ok);
  };

  useEffect(() => {
    verifyConnection();
    const interval = setInterval(verifyConnection, 30000); // check health every 30s
    return () => clearInterval(interval);
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

  // Handle PDF file upload
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

      // Add a system welcome notification message
      setMessages([
        {
          id: 'welcome_' + Date.now(),
          role: 'assistant',
          content: `📄 **Successfully indexed "${res.filename}"!**\n\n- **Pages Ingested:** ${res.pageCount}\n- **Parent Chunks:** ${res.parentChunks} (high-context documents)\n- **Child Chunks:** ${res.childChunks} (FAISS dense & BM25 sparse vectors)\n\nYou can now ask any question about this document!`,
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

  // Handle sending a chat message
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

  // Stop streaming response
  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
      );
    }
  };

  // Clear chat conversation messages
  const handleClearChat = () => {
    setMessages([]);
  };

  // Complete session reset
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
    <div className="flex h-screen overflow-hidden bg-[#080d1a] text-slate-100">
      {/* Left Sidebar */}
      <Sidebar
        docInfo={docInfo}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        onClearSession={handleClearSession}
        uploadError={uploadError}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Backdrop overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activePdf={docInfo?.filename}
          messageCount={messages.length}
          onClearChat={handleClearChat}
          backendConnected={backendConnected}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <ChatWindow
          messages={messages}
          activePdf={docInfo?.filename}
          onSuggestionClick={handleSendMessage}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStream={handleStopStream}
          disabled={!docInfo}
          activePdf={docInfo?.filename}
        />
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConnectionChanged={verifyConnection}
      />
    </div>
  );
}
