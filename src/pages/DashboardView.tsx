import React from 'react';
import { Sparkles, TrendingUp, Filter, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { TrendingSearch } from '../types';
import { TrendCard } from '../components/TrendCard';
import { BestOpportunities } from '../components/BestOpportunities';

interface Props {
  trends: TrendingSearch[];
  loading: boolean;
  error: string | null;
  selectedRegion: string;
  selectedCategory: string;
  savedTrends: TrendingSearch[];
  onSelectTrend: (trend: TrendingSearch) => void;
  onToggleSave: (trend: TrendingSearch) => void;
  onRefresh: () => void;
  onSelectCategory?: (category: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  trends,
  loading,
  error,
  selectedRegion,
  selectedCategory,
  savedTrends,
  onSelectTrend,
  onToggleSave,
  onRefresh,
  onSelectCategory,
}) => {
  const filteredTrends = trends.filter((t) => {
    if (selectedCategory === 'All') return true;
    return t.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const savedIds = new Set(savedTrends.map((s) => s.id));

  return (
    <div id="dashboard-view" className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header as specified in Prompt #9 */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI TREND RESEARCH ENGINE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Find trends. <br className="hidden sm:inline" />
            Analyze demand. <br className="hidden sm:inline" />
            Discover opportunities.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Real-time daily Google Trending searches analyzed by Gemini AI to uncover high-intent content ideas, KDP self-publishing concepts, and digital monetization angles.
          </p>
        </div>

        {/* Decorative Frosted Orbs */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[70px] pointer-events-none" />
      </div>

      {/* Error Banner if provider unavailable */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start justify-between gap-3 backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">Trending Provider Status</p>
              <p className="mt-0.5 text-amber-300 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 shrink-0 text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Best Opportunities Section (Prompt #18) */}
      {!loading && trends.length > 0 && (
        <BestOpportunities trends={trends} onSelectTrend={onSelectTrend} />
      )}

      {/* Top 10 Trending Section (Prompt #10) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Top 10 Trending Searches</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30">
                {selectedRegion}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Ranked by search volume velocity. Click any card to launch deep Gemini trend intelligence.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Showing {filteredTrends.length} of {trends.length} topics
          </span>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-2xl bg-slate-800/40 border border-white/10 backdrop-blur-md animate-pulse p-5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="w-16 h-5 bg-white/10 rounded-lg" />
                  <div className="w-8 h-8 bg-white/10 rounded-lg" />
                </div>
                <div className="w-3/4 h-6 bg-white/10 rounded-lg" />
                <div className="w-full h-12 bg-white/10 rounded-lg" />
                <div className="w-1/2 h-4 bg-white/10 rounded-lg mt-auto" />
              </div>
            ))}
          </div>
        ) : trends.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-white/10 bg-slate-800/40 backdrop-blur-md p-8 space-y-3">
            <TrendingUp className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-200">
              Belum ada data tren yang dimuat
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tren pencarian untuk wilayah {selectedRegion} belum tersedia. Silakan klik tombol refresh di bawah untuk memuat.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Tren</span>
            </button>
          </div>
        ) : filteredTrends.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-white/10 bg-slate-800/40 backdrop-blur-md p-8 space-y-3">
            <Filter className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-200">
              Tidak ada tren kategori "{selectedCategory}"
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan tren harian dalam kategori "{selectedCategory}" untuk wilayah {selectedRegion}. Anda dapat beralih ke Semua Kategori.
            </p>
            {onSelectCategory && (
              <button
                type="button"
                onClick={() => onSelectCategory('All')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
              >
                Lihat Semua Kategori
              </button>
            )}
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
      </section>
    </div>
  );
};
