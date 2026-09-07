import React, { useState } from 'react';
import { Bookmark, Trash2, Download, Search, Tag, ExternalLink, ArrowRight, FileText } from 'lucide-react';
import { TrendingSearch } from '../types';
import { OpportunityScoreBadge } from '../components/OpportunityScoreBadge';
import { exportTrendsToCsv } from '../utils/export';

interface Props {
  savedTrends: TrendingSearch[];
  onSelectTrend: (trend: TrendingSearch) => void;
  onRemoveSaved: (trendId: string) => void;
  onShowToast: (msg: string) => void;
  onOpenExport?: (trendsToExport?: TrendingSearch[]) => void;
}

export const SavedView: React.FC<Props> = ({
  savedTrends,
  onSelectTrend,
  onRemoveSaved,
  onShowToast,
  onOpenExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filtered = savedTrends.filter((t) => {
    const matchesSearch = t.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExport = () => {
    if (savedTrends.length === 0) return;
    if (onOpenExport) {
      onOpenExport(filtered.length > 0 ? filtered : savedTrends);
    } else {
      exportTrendsToCsv(savedTrends, `saved-trends-${Date.now()}.csv`);
      onShowToast('Saved trends exported to CSV');
    }
  };

  return (
    <div id="saved-view" className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-500" />
            <span>Saved Trends ({savedTrends.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bookmarked trending topics saved for future content planning, SEO campaigns, or publishing research.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={savedTrends.length === 0}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-lg shadow-indigo-600/25 border border-indigo-400/30"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Saved</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-800/40 border border-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-md placeholder:text-slate-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900/50 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 px-3 py-2 backdrop-blur-md"
        >
          <option value="All" className="bg-slate-900 text-slate-200">All Categories</option>
          <option value="Technology" className="bg-slate-900 text-slate-200">Technology</option>
          <option value="Finance" className="bg-slate-900 text-slate-200">Finance</option>
          <option value="Entertainment" className="bg-slate-900 text-slate-200">Entertainment</option>
          <option value="Sports" className="bg-slate-900 text-slate-200">Sports</option>
          <option value="Politics" className="bg-slate-900 text-slate-200">Politics</option>
          <option value="General" className="bg-slate-900 text-slate-200">General</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-white/10 bg-slate-800/40 backdrop-blur-md p-8 space-y-3">
          <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="font-bold text-slate-300 text-sm">
            No saved trends found
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click the bookmark icon on any trend card in the dashboard to save it here for offline reference and export.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectTrend(item)}
              className="p-5 rounded-2xl border border-white/10 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60 hover:border-white/20 cursor-pointer flex flex-col justify-between transition-all group shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800/60 text-slate-300 border border-white/10">
                      {item.region}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/60 text-slate-300 font-medium border border-white/10">
                      {item.category}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSaved(item.id);
                    }}
                    title="Remove from saved"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors mb-1">
                  {item.keyword}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {item.news_title || `Trending in ${item.region} with ${item.traffic} search volume.`}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <OpportunityScoreBadge score={item.opportunity_score} size="sm" isAiEstimate={true} />
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                  Analyze <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
