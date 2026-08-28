import React from 'react';
import { Menu, FileText, Bot, Sparkles, RefreshCw, Settings, Server } from 'lucide-react';

export default function Header({
  onToggleSidebar,
  activePdf,
  messageCount,
  onClearChat,
  backendConnected,
  onOpenSettings
}) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#080d1a]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
              PDF RAG Assistant
              <button
                onClick={onOpenSettings}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition border ${
                  backendConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 animate-pulse'
                }`}
                title="Click to configure backend connection"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {backendConnected ? 'Backend Connected' : 'Connect Backend'}
              </button>
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Active PDF Badge */}
        {activePdf ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-medium truncate max-w-xs shadow-inner">
            <FileText size={14} className="text-blue-400 shrink-0" />
            <span className="truncate">{activePdf}</span>
          </div>
        ) : (
          <span className="hidden sm:inline-block text-xs text-slate-500 italic">
            No document loaded
          </span>
        )}

        {/* Backend Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          title="Backend API Settings"
        >
          <Settings size={15} />
        </button>

        {/* Clear Chat Button */}
        {messageCount > 0 && (
          <button
            onClick={onClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition"
            title="Clear current chat messages"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>
    </header>
  );
}
