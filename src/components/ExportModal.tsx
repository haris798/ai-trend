import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileCode,
  FileText,
  Sparkles,
  CheckCircle2,
  Table,
  Code2,
  Info,
} from 'lucide-react';
import { TrendingSearch } from '../types';
import { exportTrendsToCsv, exportTrendsToJson, copyKeywordsToClipboard } from '../utils/export';

export type ExportFormat = 'csv' | 'json';
export type KeywordCopyFormat = 'numbered' | 'plain' | 'comma';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trends: TrendingSearch[];
  region?: string;
  category?: string;
  onShowToast?: (message: string) => void;
}

export const ExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  trends,
  region = 'All',
  category = 'All',
  onShowToast,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [copyFormat, setCopyFormat] = useState<KeywordCopyFormat>('numbered');
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Default filename based on current filters and date
  const defaultBaseName = useMemo(() => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const reg = region !== 'All' ? region.toUpperCase() : 'Global';
    const cat = category !== 'All' ? `-${category.toLowerCase()}` : '';
    return `trends-${reg}${cat}-${dateStr}`;
  }, [region, category]);

  const [customFilename, setCustomFilename] = useState(defaultBaseName);

  // Keep default filename updated when filters change
  useEffect(() => {
    setCustomFilename(defaultBaseName);
  }, [defaultBaseName]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate preview content
  const previewContent = useMemo(() => {
    if (!trends || trends.length === 0) return 'No trend data available to export.';
    
    if (format === 'csv') {
      const headers = ['Rank', 'Keyword', 'Region', 'Category', 'Traffic', 'Trend', 'OppScore'];
      const sample = trends.slice(0, 4).map((t) => [
        t.rank,
        `"${t.keyword}"`,
        t.region,
        `"${t.category}"`,
        `"${t.traffic}"`,
        t.trend_direction,
        t.opportunity_score ?? 'N/A',
      ]);
      const remaining = trends.length > 4 ? `\n... (${trends.length - 4} more rows)` : '';
      return [headers.join(','), ...sample.map((r) => r.join(','))].join('\n') + remaining;
    } else {
      const sample = trends.slice(0, 2);
      const jsonStr = JSON.stringify(sample, null, 2);
      if (trends.length > 2) {
        return jsonStr.slice(0, -1) + `  // ... and ${trends.length - 2} more trend items\n]`;
      }
      return jsonStr;
    }
  }, [trends, format]);

  if (!isOpen) return null;

  const currentExtension = format === 'csv' ? '.csv' : '.json';
  const fullFilename = customFilename.endsWith(currentExtension)
    ? customFilename
    : `${customFilename}${currentExtension}`;

  const handleDownload = () => {
    if (!trends || trends.length === 0) {
      onShowToast?.('No trends available to export.');
      return;
    }

    if (format === 'csv') {
      exportTrendsToCsv(trends, fullFilename);
      onShowToast?.(`Exported ${trends.length} trends to ${fullFilename}`);
    } else {
      exportTrendsToJson(trends, fullFilename);
      onShowToast?.(`Exported ${trends.length} trends to ${fullFilename}`);
    }
    onClose();
  };

  const handleCopyKeywords = async () => {
    if (!trends || trends.length === 0) {
      onShowToast?.('No keywords to copy.');
      return;
    }

    let text = '';
    if (copyFormat === 'numbered') {
      text = trends.map((t) => `${t.rank}. ${t.keyword}`).join('\n');
    } else if (copyFormat === 'plain') {
      text = trends.map((t) => t.keyword).join('\n');
    } else {
      text = trends.map((t) => t.keyword).join(', ');
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      onShowToast?.(`Copied ${trends.length} keywords to clipboard!`);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy keywords:', err);
      // Fallback
      copyKeywordsToClipboard(trends);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="bg-white/95 dark:bg-[#080e1e]/95 border border-slate-200 dark:border-white/10 w-full max-w-xl rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
              >
                Export Trending Data
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {trends.length} Trends
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download structured dataset or copy formatted keywords for prompt workflows.
              </p>
            </div>
          </div>

          <button
            id="btn-close-export-modal"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Format Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* CSV Card */}
              <button
                type="button"
                id="select-format-csv"
                onClick={() => setFormat('csv')}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  format === 'csv'
                    ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        format === 'csv'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">
                        CSV Format
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">.csv spreadsheet</span>
                    </div>
                  </div>
                  {format === 'csv' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Spreadsheet ready for Excel, Google Sheets, Airtable, or Python Pandas.
                </p>
              </button>

              {/* JSON Card */}
              <button
                type="button"
                id="select-format-json"
                onClick={() => setFormat('json')}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  format === 'json'
                    ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        format === 'json'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">
                        JSON Format
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">.json structured</span>
                    </div>
                  </div>
                  {format === 'json' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Full nested metadata format for software integrations, APIs, and AI models.
                </p>
              </button>
            </div>
          </div>

          {/* Filename Configuration */}
          <div>
            <label
              htmlFor="export-filename-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Export Filename
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/40">
              <input
                id="export-filename-input"
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Filename"
                className="flex-1 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400"
              />
              <span className="px-3 py-2 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono text-xs border-l border-slate-200 dark:border-white/10">
                {currentExtension}
              </span>
            </div>
          </div>

          {/* Copy Keywords Section */}
          <div className="p-4 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                  Quick Copy Keywords
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Copy keyword list directly to clipboard for Gemini/ChatGPT prompts.
                </span>
              </div>

              {/* Copy Format Pills */}
              <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-white/10 p-1 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  id="btn-copy-format-numbered"
                  onClick={() => setCopyFormat('numbered')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    copyFormat === 'numbered'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  1. 2. 3.
                </button>
                <button
                  type="button"
                  id="btn-copy-format-plain"
                  onClick={() => setCopyFormat('plain')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    copyFormat === 'plain'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Plain Lines
                </button>
                <button
                  type="button"
                  id="btn-copy-format-comma"
                  onClick={() => setCopyFormat('comma')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    copyFormat === 'comma'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Comma
                </button>
              </div>
            </div>

            <button
              type="button"
              id="btn-copy-keywords"
              onClick={handleCopyKeywords}
              className={`w-full py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                isCopied
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Copied {trends.length} Keywords to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-500" />
                  <span>Copy {trends.length} Keywords to Clipboard</span>
                </>
              )}
            </button>
          </div>

          {/* Live Data Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                {format === 'csv' ? (
                  <Table className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Code2 className="w-3.5 h-3.5 text-slate-400" />
                )}
                {format.toUpperCase()} Preview
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium"
              >
                {showPreview ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showPreview && (
              <div className="relative rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900/90 text-slate-200 p-3 font-mono text-[11px] overflow-x-auto max-h-36">
                <pre className="whitespace-pre">{previewContent}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>UTF-8 encoded output</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-export"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              id="btn-download-export"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 border border-indigo-400/30"
            >
              <Download className="w-4 h-4" />
              <span>Download {format.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
