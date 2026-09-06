import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  User,
  Copy,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
  Clock
} from 'lucide-react';
import SourcesDrawer from './SourcesDrawer';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text-to-Speech (TTS)
  const handleSpeak = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner TTS
    const cleanText = message.content
      .replace(/\[\^?\d+\]/g, '')
      .replace(/[#*`_~]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`flex gap-3.5 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } items-start animate-slide-up group`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
          isUser
            ? 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-indigo-600/20'
            : 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-cyan-400 border border-indigo-500/30 glow-indigo'
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={19} />}
      </div>

      {/* Message Bubble Box */}
      <div
        className={`max-w-[90%] sm:max-w-[82%] rounded-3xl p-4 sm:p-5 transition-all ${
          isUser
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm shadow-xl shadow-indigo-600/15'
            : 'glass-panel text-slate-100 rounded-tl-sm shadow-2xl border border-white/[0.08] hover:border-white/[0.14]'
        }`}
      >
        {/* Header with Role & Action buttons */}
        <div className="flex items-center justify-between gap-4 mb-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            {isUser ? (
              <span className="text-indigo-100 font-semibold">You</span>
            ) : (
              <span className="text-cyan-400 font-semibold flex items-center gap-1.5 font-heading">
                <Sparkles size={13} className="text-cyan-400" />
                Nexus Intelligence
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isUser && message.content && (
              <button
                onClick={handleSpeak}
                className={`p-1.5 rounded-lg transition ${
                  isSpeaking
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'hover:bg-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
                title={isSpeaking ? 'Stop speech' : 'Read aloud'}
              >
                {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            )}

            {message.content && (
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded-lg transition ${
                  isUser
                    ? 'hover:bg-indigo-700 text-indigo-100'
                    : 'hover:bg-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
                title="Copy text"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Message Content */}
        {isUser ? (
          <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose-dark text-sm sm:text-[15px]">
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2.5 text-slate-400 py-1.5 text-sm italic">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Synthesizing answer from retrieved passages...</span>
              </div>
            )}

            {/* Pulsing cursor when streaming */}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle rounded-sm" />
            )}
          </div>
        )}

        {/* Sources & Evidence Drawer */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesDrawer sources={message.sources} />
        )}
      </div>
    </div>
  );
}
