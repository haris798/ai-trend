import React, { useState, useEffect } from 'react';
import {
  X, Sparkles, TrendingUp, Search, Target, DollarSign, BookOpen,
  Share2, Copy, Check, RefreshCw, AlertCircle, Layers, CheckCircle2,
  FileText, Video, Smartphone, Pin, ExternalLink, BarChart3, Database
} from 'lucide-react';
import { TrendingSearch, TrendAnalysis, KdpAnalysisResult, MonetizationChannel } from '../types';
import { OpportunityScoreBadge } from './OpportunityScoreBadge';

interface Props {
  trend: TrendingSearch | null;
  onClose: () => void;
  onSaveToggle: (trend: TrendingSearch) => void;
  isSaved?: boolean;
  onRefreshUsage?: () => void;
}

type TabType = 'overview' | 'keywords' | 'content' | 'kdp' | 'monetization';

export const TrendDetailModal: React.FC<Props> = ({
  trend,
  onClose,
  onSaveToggle,
  isSaved,
  onRefreshUsage,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Analysis state
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [ttlHoursLeft, setTtlHoursLeft] = useState<number | null>(null);

  // Keyword expansion state
  const [keywords, setKeywords] = useState<Record<string, string[]> | null>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(false);

  // Content generation state
  const [contentIdeas, setContentIdeas] = useState<any | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // KDP state
  const [kdpData, setKdpData] = useState<KdpAnalysisResult | null>(null);
  const [loadingKdp, setLoadingKdp] = useState(false);

  // Monetization state
  const [monetizationData, setMonetizationData] = useState<MonetizationChannel[] | null>(null);
  const [loadingMonetization, setLoadingMonetization] = useState(false);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (trend) {
      // Auto fetch trend analysis when opened
      fetchAnalysis(false);
    }
  }, [trend?.keyword, trend?.region]);

  if (!trend) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchAnalysis = async (force = false) => {
    if (!trend) return;
    setLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: trend.keyword,
          region: trend.region,
          category: trend.category,
          trendData: {
            traffic: trend.traffic,
            rank: trend.rank,
            newsSnippet: trend.news_title,
          },
          forceRefresh: force,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze trend with Gemini AI');
      }

      setAnalysis(json.data);
      setIsCached(Boolean(json.cached));
      if (json.ttlRemainingMs) {
        setTtlHoursLeft(Math.max(1, Math.round(json.ttlRemainingMs / (1000 * 60 * 60))));
      } else {
        setTtlHoursLeft(24);
      }
      if (onRefreshUsage) onRefreshUsage();
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const fetchKeywords = async () => {
    if (!trend || keywords) return;
    setLoadingKeywords(true);
    try {
      const res = await fetch('/api/expand-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: trend.keyword, region: trend.region }),
      });
      const json = await res.json();
      if (json.success) setKeywords(json.data);
      if (onRefreshUsage) onRefreshUsage();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKeywords(false);
    }
  };

  const fetchContentIdeas = async () => {
    if (!trend || contentIdeas) return;
    setLoadingContent(true);
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: trend.keyword, region: trend.region, analysis }),
      });
      const json = await res.json();
      if (json.success) setContentIdeas(json.data);
      if (onRefreshUsage) onRefreshUsage();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContent(false);
    }
  };

  const fetchKdp = async () => {
    if (!trend || kdpData) return;
    setLoadingKdp(true);
    try {
      const res = await fetch('/api/generate-kdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: trend.keyword, region: trend.region }),
      });
      const json = await res.json();
      if (json.success) setKdpData(json.data);
      if (onRefreshUsage) onRefreshUsage();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKdp(false);
    }
  };

  const fetchMonetization = async () => {
    if (!trend || monetizationData) return;
    setLoadingMonetization(true);
    try {
      const res = await fetch('/api/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: trend.keyword, region: trend.region, category: trend.category }),
      });
      const json = await res.json();
      if (json.success) setMonetizationData(json.data);
      if (onRefreshUsage) onRefreshUsage();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMonetization(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#020617]/80 backdrop-blur-md overflow-y-auto">
      <div
        id="trend-detail-modal"
        className="bg-white/95 dark:bg-[#070d1d]/95 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-200/80 dark:border-white/15 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-4 bg-white/60 dark:bg-white/[0.02] backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                Rank #{trend.rank} ({trend.region})
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                REAL DATA
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-medium border border-indigo-500/25">
                {trend.category}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              {trend.keyword}
              {trend.source_url && (
                <a
                  href={trend.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Source link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </h2>

            {trend.news_title && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-2xl">
                Context: {trend.news_title}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-modal-save"
              onClick={() => onSaveToggle(trend)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                isSaved
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                  : 'bg-white/80 dark:bg-white/5 border-slate-300/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {isSaved ? 'Saved' : 'Save Trend'}
            </button>

            <button
              id="btn-modal-close"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] backdrop-blur-md overflow-x-auto">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analysis & Opportunity</span>
          </button>

          <button
            id="tab-keywords"
            onClick={() => {
              setActiveTab('keywords');
              fetchKeywords();
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'keywords'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Keyword Expansion</span>
          </button>

          <button
            id="tab-content"
            onClick={() => {
              setActiveTab('content');
              fetchContentIdeas();
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'content'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Content Generator</span>
          </button>

          <button
            id="tab-kdp"
            onClick={() => {
              setActiveTab('kdp');
              fetchKdp();
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'kdp'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>KDP Opportunity</span>
          </button>

          <button
            id="tab-monetization"
            onClick={() => {
              setActiveTab('monetization');
              fetchMonetization();
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'monetization'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>7 Monetization Avenues</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW & GEMINI ANALYSIS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Real Metrics Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block mb-0.5">Approx Traffic</span>
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {trend.traffic}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block mb-0.5">Momentum</span>
                  <span className="text-base font-bold capitalize text-slate-900 dark:text-white">
                    {trend.trend_direction} ({trend.trend_percentage || 'Normal'})
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block mb-0.5">Source Provider</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {trend.source}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 block mb-0.5">Opportunity Score</span>
                  <OpportunityScoreBadge score={analysis?.opportunity_score ?? trend.opportunity_score} size="md" />
                </div>
              </div>

              {/* Opportunity Score Formula Breakdown */}
              {analysis && (
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Opportunity Score Breakdown (Weighted Formula)
                    </h3>
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      AI ESTIMATE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Momentum (30%)</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                        {analysis.trend_momentum}/100
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Intent (20%)</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                        {analysis.search_intent}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Content (20%)</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                        {analysis.content_potential}/100
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Commercial (15%)</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                        {analysis.commercial_intent}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">Monetize (15%)</span>
                      <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                        {analysis.monetization_potential}/100
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini Qualitative Intelligence */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Gemini AI Trend Intelligence
                    </h3>
                    {analysis && (
                      isCached ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                          title="Retrieved from 24-hour Supabase cache to reduce API costs"
                        >
                          <Database className="w-3 h-3" />
                          Cached (24h TTL{ttlHoursLeft ? ` • ~${ttlHoursLeft}h left` : ''})
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25"
                          title="Freshly generated with Gemini 3.8-Flash and cached for 24 hours"
                        >
                          <Sparkles className="w-3 h-3" />
                          Fresh Gemini Run
                        </span>
                      )
                    )}
                  </div>

                  <button
                    id="btn-reanalyze"
                    onClick={() => fetchAnalysis(true)}
                    disabled={loadingAnalysis}
                    title="Bypass 24-hour cache and request fresh Gemini AI analysis"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                    <span>Re-analyze</span>
                  </button>
                </div>

                {loadingAnalysis ? (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    <p className="text-xs text-slate-400">
                      Gemini is evaluating search intent, audience profile, and monetization viability...
                    </p>
                  </div>
                ) : analysisError ? (
                  <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Gemini Analysis Unavailable</p>
                      <p>{analysisError}</p>
                    </div>
                  </div>
                ) : analysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="font-bold text-slate-500 uppercase font-mono block mb-1">Why is this trending?</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {analysis.why_trending}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="font-bold text-slate-500 uppercase font-mono block mb-1">Target Audience</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {analysis.audience}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="font-bold text-slate-500 uppercase font-mono block mb-1">Search Intent & Type</span>
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong className="text-blue-600 dark:text-blue-400">{analysis.search_intent}</strong> intent • {analysis.trend_type}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="font-bold text-slate-500 uppercase font-mono block mb-1">Longevity & Competition</span>
                      <p className="text-slate-800 dark:text-slate-200">
                        Lifespan: <strong>{analysis.longevity}</strong> • Competition: <strong>{analysis.competition}</strong>
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* TAB 2: KEYWORD EXPANSION */}
          {activeTab === 'keywords' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Keyword Expansion
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      AI GENERATED
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-value keyword variations categorized for search intent and SEO clustering.
                  </p>
                </div>

                <button
                  onClick={fetchKeywords}
                  disabled={loadingKeywords}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingKeywords ? 'animate-spin' : ''}`} />
                  <span>{keywords ? 'Regenerate' : 'Expand Keywords'}</span>
                </button>
              </div>

              {loadingKeywords ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs text-slate-400">Generating 45+ categorized keyword clusters...</p>
                </div>
              ) : keywords ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'related', title: '10 Related Keywords', tag: 'Semantic' },
                    { key: 'long_tail', title: '10 Long-Tail Keywords', tag: 'High-Intent' },
                    { key: 'question', title: '10 Question Keywords', tag: 'People Also Ask' },
                    { key: 'commercial', title: '10 Commercial Keywords', tag: 'Buyer Intent' },
                    { key: 'low_competition', title: '5 Low Competition Ideas', tag: 'Fast Ranking' },
                  ].map(({ key, title, tag }) => {
                    const list = keywords[key] || [];
                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${
                          key === 'low_competition' ? 'md:col-span-2 bg-emerald-500/5 border-emerald-500/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {tag}
                            </span>
                          </h4>
                          <button
                            onClick={() => handleCopy(list.join('\n'), key)}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                          >
                            {copiedKey === key ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === key ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        <ul className="space-y-1.5">
                          {list.map((kw, i) => (
                            <li
                              key={i}
                              className="text-xs text-slate-700 dark:text-slate-300 py-1 px-2 rounded bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between group"
                            >
                              <span>{kw}</span>
                              <button
                                onClick={() => handleCopy(kw, `${key}-${i}`)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity"
                              >
                                {copiedKey === `${key}-${i}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: CONTENT GENERATOR */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Multi-Platform Content Generator
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      AI GENERATED
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Targeted ideas for Blog, YouTube, TikTok, Pinterest, and KDP.
                  </p>
                </div>

                <button
                  onClick={fetchContentIdeas}
                  disabled={loadingContent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingContent ? 'animate-spin' : ''}`} />
                  <span>{contentIdeas ? 'Regenerate Ideas' : 'Generate Content'}</span>
                </button>
              </div>

              {loadingContent ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs text-slate-400">Crafting platform-tailored hooks, concepts, and titles...</p>
                </div>
              ) : contentIdeas ? (
                <div className="space-y-6">
                  {/* Blog Section */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      10 Blog Article Titles & Angles
                    </h4>
                    <div className="space-y-2">
                      {contentIdeas.blog?.map((item: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{i + 1}. {item.title}</p>
                          <p className="text-slate-500 dark:text-slate-400"><strong>Angle:</strong> {item.angle} • <strong>Monetize:</strong> {item.monetization}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* YouTube Section */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                      <Video className="w-4 h-4 text-rose-500" />
                      10 YouTube Titles & 3-Second Hooks
                    </h4>
                    <div className="space-y-2">
                      {contentIdeas.youtube?.map((item: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{i + 1}. {item.title}</p>
                          <p className="text-amber-600 dark:text-amber-400 italic">"Hook: {item.hook}"</p>
                          <p className="text-slate-500 dark:text-slate-400">{item.concept} • {item.monetization}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TikTok Section */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                      <Smartphone className="w-4 h-4 text-purple-500" />
                      10 TikTok / Reels Concepts & Hooks
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {contentIdeas.tiktok?.map((item: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white">#{i + 1} Hook: "{item.hook}"</p>
                          <p className="text-slate-600 dark:text-slate-300">Concept: {item.concept}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pinterest Section */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                      <Pin className="w-4 h-4 text-red-600" />
                      10 Pinterest Pin Ideas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {contentIdeas.pinterest?.map((item: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{i + 1}. {item.pinTitle}</p>
                          <p className="text-slate-500 dark:text-slate-400">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: KDP IN-DEPTH ANALYSIS */}
          {activeTab === 'kdp' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Amazon KDP Publishing Feasibility
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      AI ESTIMATE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Low & medium content publishing potential on Amazon KDP. Note: Does not guarantee sales.
                  </p>
                </div>

                <button
                  onClick={fetchKdp}
                  disabled={loadingKdp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingKdp ? 'animate-spin' : ''}`} />
                  <span>{kdpData ? 'Regenerate KDP' : 'Analyze KDP Opportunity'}</span>
                </button>
              </div>

              {loadingKdp ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                  <p className="text-xs text-slate-400">Analyzing Amazon publishing competition, niches, and book outlines...</p>
                </div>
              ) : kdpData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[10px]">KDP Potential</span>
                      <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {kdpData.kdpPotential}/100
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[10px]">Evergreen Score</span>
                      <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                        {kdpData.evergreenPotential}/100
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[10px]">Recommended Book Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {kdpData.bookType}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[10px]">Competition Level</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {kdpData.competition}
                      </span>
                    </div>
                  </div>

                  {/* 10 Book Concepts with outlines */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      10 Amazon KDP Book Concepts & Chapter Outlines
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kdpData.concepts?.map((c, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                Concept #{i + 1} • {c.bookType}
                              </span>
                              <h5 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                                {c.title}
                              </h5>
                              <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                                {c.subtitle}
                              </p>
                            </div>
                          </div>

                          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                            {c.description}
                          </p>

                          {c.outline && (
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                              <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                Chapter Outline
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                                {c.outline.map((ch, idx) => (
                                  <li key={idx}>{ch}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            💡 Monetization Tip: {c.monetizationTip}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 5: MONETIZATION ANALYSIS */}
          {activeTab === 'monetization' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    7 Monetization Channels Analysis
                    <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      AI ESTIMATE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comparative viability scores and actionable execution steps for this trending traffic.
                  </p>
                </div>

                <button
                  onClick={fetchMonetization}
                  disabled={loadingMonetization}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMonetization ? 'animate-spin' : ''}`} />
                  <span>{monetizationData ? 'Regenerate' : 'Analyze Monetization'}</span>
                </button>
              </div>

              {loadingMonetization ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs text-slate-400">Scoring commercial viability across 7 digital monetization avenues...</p>
                </div>
              ) : monetizationData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monetizationData.map((channel, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {channel.channel}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                            {channel.score}/100
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              channel.score >= 75
                                ? 'bg-emerald-500'
                                : channel.score >= 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                          />
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        {channel.recommendation}
                      </p>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1">
                        <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">
                          Action Steps
                        </span>
                        <ul className="space-y-1">
                          {channel.actionableSteps?.map((step, idx) => (
                            <li key={idx} className="text-slate-600 dark:text-slate-400 text-[11px] flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
