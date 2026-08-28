import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Sparkles } from 'lucide-react';
import SourcesDrawer from './SourcesDrawer';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3.5 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } items-start animate-slide-up group`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
          isUser
            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
            : 'bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-950 text-blue-400 border border-blue-500/30 glow-subtle'
        }`}
      >
        {isUser ? <User size={18} /> : <Bot size={19} />}
      </div>

      {/* Bubble Content */}
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 transition-all ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10'
            : 'glass-panel text-slate-100 rounded-tl-none shadow-xl border border-slate-800/80 hover:border-slate-700/80'
        }`}
      >
        {/* Header (Role & Actions) */}
        <div className="flex items-center justify-between gap-4 mb-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            {isUser ? (
              <span className="text-blue-100">You</span>
            ) : (
              <span className="text-blue-400 flex items-center gap-1">
                <Sparkles size={12} className="text-blue-400" />
                AI Assistant
              </span>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className={`p-1 rounded transition ${
                isUser
                  ? 'hover:bg-blue-700 text-blue-100'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Copy message"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Message Body */}
        {isUser ? (
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose-dark text-sm sm:text-base">
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 py-1 text-sm italic animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                Searching document and generating answer...
              </div>
            )}

            {/* If stream is active and message is still typing */}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse-subtle align-middle" />
            )}
          </div>
        )}

        {/* Retrieved Sources Accordion for Bot Responses */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesDrawer sources={message.sources} />
        )}
      </div>
    </div>
  );
}
