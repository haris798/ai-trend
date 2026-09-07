import React from 'react';
import { TrendingUp, TrendingDown, Minus, Bookmark, BookmarkCheck, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import { TrendingSearch } from '../types';
import { OpportunityScoreBadge } from './OpportunityScoreBadge';
import { TrendSparkline } from './TrendSparkline';

interface Props {
  trend: TrendingSearch;
  isSaved?: boolean;
  onSelect: (trend: TrendingSearch) => void;
  onToggleSave: (trend: TrendingSearch) => void;
  onQuickAnalyze?: (trend: TrendingSearch) => void;
  isAnalyzing?: boolean;
}

export const TrendCard: React.FC<Props> = ({
  trend,
  isSaved,
  onSelect,
  onToggleSave,
  onQuickAnalyze,
  isAnalyzing,
}) => {
  const getDirectionIcon = () => {
    switch (trend.trend_direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      id={`trend-card-${trend.rank}`}
      className="group relative bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 hover:bg-slate-800/60 hover:border-white/20 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
      onClick={() => onSelect(trend)}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-800/60 text-slate-200 font-mono font-bold text-xs border border-white/10">
              #{trend.rank}
            </span>
            <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              REAL DATA
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/60 text-slate-300 font-medium border border-white/10">
              {trend.category}
            </span>
          </div>

          <button
            id={`btn-save-trend-${trend.rank}`}
            title={isSaved ? 'Remove from saved' : 'Save trend'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(trend);
            }}
            className={`p-2 rounded-xl border transition-colors ${
              isSaved
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'border-white/10 text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/80'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* Keyword & Snippet */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors flex items-center gap-2">
            {trend.keyword}
            {trend.source_url && (
              <a
                href={trend.source_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="View on Google Trends / News"
                className="text-slate-400 hover:text-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </h3>

          {trend.news_title && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {trend.news_title}
            </p>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-md mb-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-0.5">Approx Traffic</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
              <span>{trend.traffic}</span>
              {trend.trend_percentage && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  ({trend.trend_percentage})
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] mb-0.5">Trend Momentum</span>
            <div className="flex items-center gap-1 font-medium capitalize text-slate-300">
              {getDirectionIcon()}
              <span>{trend.trend_direction}</span>
            </div>
          </div>
        </div>

        {/* 24h Ranking Sparkline */}
        <div className="p-3 rounded-xl bg-slate-900/40 border border-white/10 backdrop-blur-md mb-4">
          <TrendSparkline trend={trend} />
        </div>
      </div>

      {/* Footer / Opportunity Score & Action */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Opportunity:</span>
          <OpportunityScoreBadge score={trend.opportunity_score} size="sm" isAiEstimate={true} />
        </div>

        <button
          id={`btn-analyze-${trend.rank}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(trend);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
        >
          <span>Deep Analyze</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
