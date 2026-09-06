import React from 'react';
import {
  Menu,
  FileText,
  Sparkles,
  RefreshCw,
  Settings,
  Cpu,
  Zap,
  Download,
  GitGraph,
  Share2,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export default function Header({
  onToggleSidebar,
  activePdf,
  docInfo,
  messageCount,
  onClearChat,
  backendConnected,
  onOpenSettings,
  onLoadSample,
  onRemovePDF,
  onOpenPipeline,
  onOpenExport,
  selectedModel,
  onModelChange,
  isUploading
}) {
  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#060914]/90 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Left side: Mobile menu toggle + Logo + Backend Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105">
              <Sparkles size={18} />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-300 -z-10" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-1.5">
                Nexus<span className="text-gradient-accent">RAG</span>
              </h1>

              {/* Status Pill */}
              <button
                onClick={onOpenSettings}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium transition border ${
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
                <span className="hidden sm:inline">{backendConnected ? 'Engine Ready' : 'Disconnected'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Middle/Right: Actions, Graph Visualizer, Model Selector, Export */}
      <div className="flex items-center gap-2">
        {/* Active Document Tag */}
        {activePdf ? (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-xs font-medium shadow-inner max-w-xs group">
            <FileText size={14} className="text-cyan-400 shrink-0" />
            <span className="truncate max-w-[120px]" title={activePdf}>
              {activePdf}
            </span>
            {docInfo?.pageCount && (
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/25 text-indigo-300 text-[10px] font-mono">
                {docInfo.pageCount}p
              </span>
            )}
            <button
              onClick={onRemovePDF}
              className="ml-1 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
              title="Remove this document"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={onLoadSample}
            disabled={isUploading}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-100 text-xs font-medium transition shadow-sm"
          >
            <Zap size={13} className="text-cyan-400" />
            <span>Try Sample PDF</span>
          </button>
        )}

        {/* Pipeline Graph Visualizer Trigger */}
        <button
          onClick={onOpenPipeline}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-indigo-950/60 border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-cyan-300 text-xs font-medium transition shadow-sm"
          title="Open interactive RAG Pipeline Flow Graph"
        >
          <GitGraph size={14} className="text-purple-400" />
          <span className="hidden md:inline">Pipeline Graph</span>
        </button>

        {/* Model Selector Dropdown */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-xs text-slate-300">
          <Cpu size={13} className="text-cyan-400" />
          <select
            value={selectedModel || 'openai/gpt-oss-120b'}
            onChange={(e) => onModelChange && onModelChange(e.target.value)}
            className="bg-transparent text-slate-200 text-xs font-mono focus:outline-none cursor-pointer pr-1"
          >
            <option value="openai/gpt-oss-120b" className="bg-slate-900 text-slate-200">
              GPT-OSS-120B (Groq Fast)
            </option>
            <option value="openai/gpt-oss-20b" className="bg-slate-900 text-slate-200">
              GPT-OSS-20B (Instant)
            </option>
            <option value="qwen/qwen3.6-27b" className="bg-slate-900 text-slate-200">
              Qwen 3.6 27B
            </option>
          </select>
        </div>

        {/* Export Conversation Button */}
        {messageCount > 0 && (
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition"
            title="Export chat history as Markdown or JSON"
          >
            <Download size={13} className="text-indigo-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Clear Chat Button */}
        {messageCount > 0 && (
          <button
            onClick={onClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition"
            title="Clear chat messages"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition shadow-sm"
          title="Backend API Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
