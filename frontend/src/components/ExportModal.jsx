import React, { useState } from 'react';
import {
  X,
  Download,
  FileCode,
  FileText,
  Check,
  Share2,
  Copy,
  Sparkles
} from 'lucide-react';

export default function ExportModal({ isOpen, onClose, messages, docInfo }) {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');

  if (!isOpen) return null;

  const generateMarkdown = () => {
    let md = `# NexusRAG Conversation Export\n`;
    md += `**Document:** ${docInfo?.filename || 'No document loaded'}\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Messages:** ${messages.length}\n\n---\n\n`;

    messages.forEach((msg, idx) => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Nexus Assistant';
      md += `### ${role}\n\n${msg.content}\n\n`;

      if (msg.sources && msg.sources.length > 0) {
        md += `#### 📚 Citations & Evidence:\n`;
        msg.sources.forEach((src, sIdx) => {
          md += `- **[Source ${sIdx + 1}]** Page ${src.page} (${src.relevancePercentage}% Relevance | ${src.retrievalMethod})\n`;
          md += `  > ${src.childContent.replace(/\n/g, ' ')}\n\n`;
        });
      }
      md += `---\n\n`;
    });

    return md;
  };

  const generateJSON = () => {
    return JSON.stringify(
      {
        document: docInfo,
        exportedAt: new Date().toISOString(),
        messages: messages,
      },
      null,
      2
    );
  };

  const getExportText = () => {
    return exportFormat === 'markdown' ? generateMarkdown() : generateJSON();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getExportText();
    const ext = exportFormat === 'markdown' ? 'md' : 'json';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_rag_chat_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#090e1d] border border-white/[0.1] shadow-2xl p-6 sm:p-7 space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">Export Conversation</h3>
              <p className="text-xs text-slate-400">Save and share your RAG chat history</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Choose Format
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setExportFormat('markdown')}
              className={`p-3 rounded-2xl border flex items-center gap-2.5 transition text-left ${
                exportFormat === 'markdown'
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                  : 'bg-slate-900/60 border-white/[0.06] text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={18} className="text-indigo-400" />
              <div>
                <p className="text-xs font-semibold text-slate-100">Markdown (.md)</p>
                <p className="text-[10.5px] text-slate-400">Formatted with citations</p>
              </div>
            </button>

            <button
              onClick={() => setExportFormat('json')}
              className={`p-3 rounded-2xl border flex items-center gap-2.5 transition text-left ${
                exportFormat === 'json'
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                  : 'bg-slate-900/60 border-white/[0.06] text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode size={18} className="text-cyan-400" />
              <div>
                <p className="text-xs font-semibold text-slate-100">JSON Data (.json)</p>
                <p className="text-[10.5px] text-slate-400">Raw messages & scores</p>
              </div>
            </button>
          </div>
        </div>

        {/* Preview Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Preview:</span>
            <span className="font-mono text-[11px]">{messages.length} message(s)</span>
          </div>
          <div className="font-mono text-[11.5px] leading-relaxed text-slate-300 bg-slate-950/80 p-3.5 rounded-2xl border border-white/[0.06] max-h-48 overflow-y-auto whitespace-pre-wrap">
            {getExportText().slice(0, 500)}...
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-200 transition"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition transform hover:scale-105"
          >
            <Download size={14} />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  );
}
