import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  CornerDownLeft,
  Mic,
  MicOff,
  Zap,
  Volume2
} from 'lucide-react';

const SUGGESTIONS = [
  '📄 Summarize core findings & key takeaways',
  '🔍 Extract all statistical metrics and entities',
  '📊 Explain methodology and pipeline architecture',
  '❓ What are the actionable recommendations?'
];

export default function ChatInput({
  onSendMessage,
  isStreaming,
  onStopStream,
  disabled,
  activePdf,
  onLoadSample
}) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is supported in Chrome and Edge browsers.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Auto resize textarea height
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
    const cleanText = suggestion.replace(/^[^\w]+/, '').trim();
    onSendMessage(cleanText);
  };

  return (
    <div className="p-4 bg-[#05070f]/92 backdrop-blur-2xl border-t border-white/[0.08] sticky bottom-0 z-20">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Quick prompt chips */}
        {!disabled && !isStreaming && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 shrink-0 font-semibold pl-1">
              <Sparkles size={13} className="text-cyan-400" /> Prompts:
            </span>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s)}
                className="shrink-0 px-3.5 py-1.5 rounded-full bg-slate-900/80 text-slate-300 border border-white/[0.08] hover:border-indigo-500/50 hover:text-cyan-300 hover:bg-slate-800/80 transition text-[11.5px] glass-pill shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Box Capsule Dock */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2.5">
          <div className="relative flex-1 rounded-3xl bg-slate-900/90 border border-white/[0.1] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/25 shadow-2xl transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                disabled
                  ? '👈 Ingest a PDF document from the sidebar to ask questions...'
                  : `Ask anything about ${activePdf || 'the uploaded PDF'}... (Press Enter to send, Shift+Enter for newline)`
              }
              rows={1}
              className="w-full bg-transparent px-5 py-4 pr-24 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 resize-none outline-none max-h-40 overflow-y-auto"
            />

            {/* Right Action Icons inside input: Voice Mic */}
            <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
              {isListening && (
                <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                  <span className="soundwave-bar h-2" />
                  <span className="soundwave-bar h-3" />
                  <span className="soundwave-bar h-2" />
                  <span className="ml-1">Listening</span>
                </div>
              )}

              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={disabled || isStreaming}
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08]'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Voice input (Speech to Text)'}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <div className="hidden sm:flex items-center gap-0.5 text-[10px] text-slate-500 font-mono pointer-events-none pr-1">
                <span>↵</span>
              </div>
            </div>
          </div>

          {/* Send or Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStream}
              className="p-4 rounded-3xl bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center shrink-0 animate-pulse"
              title="Stop generating"
            >
              <Square size={18} className="fill-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              className="p-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-40 disabled:hover:from-indigo-600 text-white shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center shrink-0 transform hover:scale-105"
              title="Send message"
            >
              <Send size={18} />
            </button>
          )}
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            FAISS Dense + BM25 Sparse + Cross-Encoder Rerank
          </span>
          <span className="hidden sm:inline-block">Groq Fast Token Stream</span>
        </div>
      </div>
    </div>
  );
}
