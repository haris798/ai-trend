import React, { useState } from 'react';
import {
  Search, LayoutGrid, Table, Download, Copy, Bookmark, BookmarkCheck,
  ArrowRight, ExternalLink, ArrowUpDown, Sparkles
} from 'lucide-react';
import { TrendingSearch } from '../types';
import { TrendCard } from '../components/TrendCard';
import { OpportunityScoreBadge } from '../components/OpportunityScoreBadge';
import { exportTrendsToCsv, copyKeywordsToClipboard } from '../utils/export';

interface Props {
  trends: TrendingSearch[];
  loading: boolean;
  selectedRegion: string;
  savedTrends: TrendingSearch[];
  onSelectTrend: (trend: TrendingSearch) => void;
  onToggleSave: (trend: TrendingSearch) => void;
  onShowToast: (msg: string) => void;
  onOpenExport?: (trendsToExport?: TrendingSearch[]) => void;
}

export const TrendingView: React.FC<Props> = ({
  trends,
  loading,
  selectedRegion,
  savedTrends,
  onSelectTrend,
  onToggleSave,
  onShowToast,
  onOpenExport,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'score' | 'traffic'>('rank');

  const savedIds = new Set(savedTrends.map((s) => s.id));

  const filteredTrends = trends
    .filter((t) => t.keyword.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0);
      }
      if (sortBy === 'traffic') {
        return parseInt(b.traffic.replace(/[^0-9]/g, '') || '0') - parseInt(a.traffic.replace(/[^0-9]/g, '') || '0');
      }
      return a.rank - b.rank;
    });

  const handleExport = () => {
    if (onOpenExport) {
      onOpenExport(filteredTrends);
    } else {
      exportTrendsToCsv(filteredTrends, `trending-${selectedRegion}.csv`);
      onShowToast('Exported filtered trends to CSV');
    }
  };

  const handleCopyAll = async () => {
    const ok = await copyKeywordsToClipboard(filteredTrends);
    if (ok) onShowToast('Keywords copied to clipboard');
  };

  return (
    <div id="trending-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/40 border border-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-trends"
            type="text"
            placeholder="Search keywords or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 backdrop-blur-md placeholder:text-slate-500"
          />
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-900/40 rounded-xl border border-white/10">
            <button
              onClick={() => setSortBy('rank')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'rank' ? 'bg-indigo-600 shadow-xs text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rank #
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'score' ? 'bg-indigo-600 shadow-xs text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Opp. Score
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900/40 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-600 shadow-xs text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-indigo-600 shadow-xs text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCopyAll}
            className="p-2 text-xs font-semibold rounded-xl border border-white/10 bg-slate-800/40 text-slate-200 hover:bg-slate-800/80 flex items-center gap-1.5 backdrop-blur-md"
            title="Copy all keywords"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Copy All</span>
          </button>

          <button
            id="btn-trending-export"
            onClick={handleExport}
            className="p-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 border border-indigo-400/30"
            title="Export trending data"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Table Mode */}
      {viewMode === 'table' ? (
        <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/40 border-b border-white/10 text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-16">Rank</th>
                  <th className="py-3.5 px-4">Keyword</th>
                  <th className="py-3.5 px-4">Approx Traffic</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Momentum</th>
                  <th className="py-3.5 px-4">Opportunity Score</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTrends.map((t) => {
                  const isSaved = savedIds.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTrend(t)}
                      className="hover:bg-slate-700/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #{t.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                          {t.keyword}
                          {t.source_url && (
                            <a
                              href={t.source_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {t.news_title && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                            {t.news_title}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                        {t.traffic}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800/60 text-slate-300 font-medium border border-white/10">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-300">
                        {t.trend_direction} {t.trend_percentage ? `(${t.trend_percentage})` : ''}
                      </td>
                      <td className="py-3.5 px-4">
                        <OpportunityScoreBadge score={t.opportunity_score} size="sm" isAiEstimate={true} />
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onToggleSave(t)}
                            title={isSaved ? 'Remove' : 'Save'}
                            className={`p-1.5 rounded-xl border transition-colors ${
                              isSaved
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                : 'border-white/10 text-slate-400 hover:text-slate-200 bg-slate-800/40'
                            }`}
                          >
                            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => onSelectTrend(t)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 font-semibold hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors flex items-center gap-1 text-xs"
                          >
                            <span>Analyze</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrends.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              isSaved={savedIds.has(trend.id)}
              onSelect={onSelectTrend}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
};
