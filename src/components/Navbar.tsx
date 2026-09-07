import React, { useEffect } from 'react';
import { Menu, RefreshCw, Download, Globe, Clock, Tag, Sparkles } from 'lucide-react';
import { AiUsageStats, TrendingSearch } from '../types';
import { AiUsageBadge } from './AiUsageBadge';
import { exportTrendsToCsv, exportTrendsToJson, copyKeywordsToClipboard } from '../utils/export';

export const CATEGORY_STORAGE_KEY = 'ai_trend_category';

interface Props {
  onOpenMobile: () => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  selectedTimeframe: string;
  onSelectTimeframe: (timeframe: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onRefresh: () => void;
  loading: boolean;
  aiUsage: AiUsageStats | null;
  trends: TrendingSearch[];
  onShowToast: (message: string) => void;
  onOpenExport?: () => void;
}

export const COUNTRIES = [
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
];

export const TIMEFRAMES = [
  { id: '24h', label: 'Trending Now (24h)' },
  { id: '48h', label: 'Past 48 Hours' },
  { id: '7d', label: 'Past 7 Days' },
];

export const CATEGORIES = [
  'All',
  'Technology',
  'Finance',
  'Entertainment',
  'Sports',
  'Politics',
  'General',
];

export const Navbar: React.FC<Props> = ({
  onOpenMobile,
  selectedRegion,
  onSelectRegion,
  selectedTimeframe,
  onSelectTimeframe,
  selectedCategory,
  onSelectCategory,
  onRefresh,
  loading,
  aiUsage,
  trends,
  onShowToast,
  onOpenExport,
}) => {
  // Sync selectedCategory to localStorage whenever it changes
  useEffect(() => {
    if (selectedCategory) {
      try {
        localStorage.setItem(CATEGORY_STORAGE_KEY, selectedCategory);
      } catch (err) {
        console.warn('Failed to persist category to localStorage:', err);
      }
    }
  }, [selectedCategory]);

  // Read saved category on initial mount if available and valid
  useEffect(() => {
    try {
      const savedCategory = localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (savedCategory && savedCategory !== selectedCategory && CATEGORIES.includes(savedCategory)) {
        onSelectCategory(savedCategory);
      }
    } catch (err) {
      console.warn('Failed to read category from localStorage:', err);
    }
  }, []);

  const handleCategoryChange = (newCategory: string) => {
    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, newCategory);
    } catch (err) {
      console.warn('Failed to persist category to localStorage:', err);
    }
    onSelectCategory(newCategory);
  };

  const handleExportCsv = () => {
    if (trends.length === 0) return;
    exportTrendsToCsv(trends, `trends-${selectedRegion}-${Date.now()}.csv`);
    onShowToast('Trends exported as CSV');
  };

  const handleCopy = async () => {
    if (trends.length === 0) return;
    const ok = await copyKeywordsToClipboard(trends);
    if (ok) onShowToast('Top keywords copied to clipboard');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Mobile hamburger & title or usage */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              id="btn-mobile-menu"
              onClick={onOpenMobile}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 lg:hidden bg-slate-100/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">ENGINE STATUS</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Trends Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AiUsageBadge stats={aiUsage} />
          </div>
        </div>

        {/* Right: Controls (Country, Timeframe, Category, Refresh, Export) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Country Selector */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              id="select-country"
              value={selectedRegion}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 cursor-pointer hover:border-slate-400 dark:hover:border-white/25 transition-all backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-slate-100">
                  {c.flag} {c.name} ({c.code})
                </option>
              ))}
            </select>
            <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Timeframe Selector */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              id="select-timeframe"
              value={selectedTimeframe}
              onChange={(e) => onSelectTimeframe(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 cursor-pointer hover:border-slate-400 dark:hover:border-white/25 transition-all backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                  {t.label}
                </option>
              ))}
            </select>
            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Category Selector */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              id="select-category"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 cursor-pointer hover:border-slate-400 dark:hover:border-white/25 transition-all backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-100">
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
            <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            id="btn-refresh-trends"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh trends from provider"
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/25 border border-indigo-400/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Action */}
          <button
            id="btn-export-data"
            onClick={onOpenExport || handleExportCsv}
            title="Export trending data (CSV / JSON / Copy Keywords)"
            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 shrink-0 text-xs font-semibold backdrop-blur-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
