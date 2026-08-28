import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Layers,
  Database,
  Cpu,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  BookOpen,
  Server
} from 'lucide-react';

export default function Sidebar({
  docInfo,
  onFileUpload,
  isUploading,
  onClearSession,
  uploadError,
  isOpen,
  onClose,
  onOpenSettings
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].name.toLowerCase().endsWith('.pdf')) {
        onFileUpload(files[0]);
      } else {
        alert('Please upload a valid PDF document.');
      }
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
    // reset input value so re-uploading same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-80 sm:w-88 bg-[#0b1122]/95 backdrop-blur-xl border-r border-slate-800/90 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 tracking-wide flex items-center gap-1.5">
              PDF RAG Engine
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-mono uppercase tracking-wider">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Decoupled Multi-Stage Pipeline</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Upload Zone */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UploadCloud size={14} className="text-blue-400" />
            Upload Document
          </label>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-blue-400 bg-blue-500/10 scale-[0.99]'
                : 'border-slate-700/80 hover:border-blue-500/50 bg-slate-900/50 hover:bg-slate-900/80'
            } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                ) : (
                  <FileText size={24} />
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-200">
                  {isUploading ? 'Indexing Document...' : 'Click or drop PDF here'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Parent-child chunking & vector indexing
                </p>
              </div>
            </div>

            {isUploading && (
              <div className="mt-3">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full animate-pulse w-3/4"></div>
                </div>
                <p className="text-[10px] text-blue-400 mt-1.5 italic">
                  Parsing pages, building BM25 & FAISS stores...
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-snug">{uploadError}</span>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Server size={12} />
                  Configure Backend URL
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active Document Stats */}
        {docInfo && docInfo.filename ? (
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-fade-in border border-blue-500/20 bg-blue-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Active Knowledge Base
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                Indexed
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5">
              <FileText size={20} className="text-blue-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate" title={docInfo.filename}>
                  {docInfo.filename}
                </p>
                <p className="text-[11px] text-slate-400">{docInfo.pageCount} Pages Ingested</p>
              </div>
            </div>

            {/* Chunking Hierarchy Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Parent Chunks</span>
                <span className="text-base font-bold text-slate-100 font-mono">
                  {docInfo.parentChunks || 0}
                </span>
                <span className="text-[9px] text-slate-500 block">~1200 chars</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Child Chunks</span>
                <span className="text-base font-bold text-blue-400 font-mono">
                  {docInfo.childChunks || 0}
                </span>
                <span className="text-[9px] text-slate-500 block">~300 chars</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">No document loaded yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">Upload a PDF above to begin.</p>
          </div>
        )}

        {/* Multi-Stage Architecture Showcase */}
        <div className="glass-panel rounded-2xl p-4 space-y-2.5 border border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400" />
            RAG Pipeline Architecture
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/70">
              <Layers size={15} className="text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200 text-[11.5px]">Parent-Child Retrieval</p>
                <p className="text-[10.5px] text-slate-400">High-precision search with full parent context</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/70">
              <Database size={15} className="text-purple-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200 text-[11.5px]">Hybrid Search (RRF)</p>
                <p className="text-[10.5px] text-slate-400">Dense FAISS + Sparse BM25 Fusion</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/70">
              <Cpu size={15} className="text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200 text-[11.5px]">Cross-Encoder Reranker</p>
                <p className="text-[10.5px] text-slate-400">ms-marco-MiniLM (Top 15 → Top 5)</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/70">
              <Sparkles size={15} className="text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200 text-[11.5px]">Groq Fast Inference</p>
                <p className="text-[10.5px] text-slate-400">Low-latency token streaming</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <button
          onClick={onClearSession}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition text-xs font-medium"
        >
          <Trash2 size={14} />
          Reset Session & Memory
        </button>
      </div>
    </aside>
  );
}
