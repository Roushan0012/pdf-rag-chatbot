import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, CornerDownLeft } from 'lucide-react';

const SUGGESTIONS = [
  '📄 Summarize the key points of this document',
  '🔍 What are the most important takeaways?',
  '📊 Extract actionable insights and findings',
  '❓ What methodologies or approaches are discussed?'
];

export default function ChatInput({ onSendMessage, isStreaming, onStopStream, disabled, activePdf }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || disabled || isStreaming) return;
    
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (disabled || isStreaming) return;
    // Strip leading emoji
    const cleanText = suggestion.replace(/^[^\w]+/, '').trim();
    onSendMessage(cleanText);
  };

  return (
    <div className="p-4 bg-[#080d1a]/90 backdrop-blur-lg border-t border-slate-800/80">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Quick prompt suggestions (shown when idle and document is loaded) */}
        {!disabled && !isStreaming && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-slate-500 flex items-center gap-1 shrink-0 font-medium pl-1">
              <Sparkles size={12} className="text-blue-400" /> Prompts:
            </span>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s)}
                className="shrink-0 px-3 py-1 rounded-full bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-blue-500/40 hover:text-blue-300 hover:bg-slate-800/60 transition text-[11.5px]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1 rounded-2xl bg-slate-900/90 border border-slate-700/60 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 shadow-inner transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                disabled
                  ? '👈 Upload a PDF document from the sidebar to start asking questions...'
                  : `Ask anything about ${activePdf || 'the uploaded PDF'}... (Press Enter to send)`
              }
              rows={1}
              className="w-full bg-transparent px-4 py-3.5 pr-12 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 resize-none outline-none max-h-40 overflow-y-auto"
            />

            <div className="absolute right-3 bottom-3 hidden sm:flex items-center gap-1 text-[11px] text-slate-500 pointer-events-none">
              <span>Enter</span>
              <CornerDownLeft size={11} />
            </div>
          </div>

          {/* Send / Stop Action Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStream}
              className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center shrink-0"
              title="Stop generating"
            >
              <Square size={18} className="fill-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center shrink-0"
              title="Send message"
            >
              <Send size={18} />
            </button>
          )}
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>RAG Pipeline: Dense FAISS + Sparse BM25 + Cross-Encoder Reranking</span>
          <span>Groq Ultra-Fast Inference</span>
        </div>
      </div>
    </div>
  );
}
