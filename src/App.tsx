import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, PageView } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './pages/DashboardView';
import { TrendingView } from './pages/TrendingView';
import { SavedView } from './pages/SavedView';
import { HistoryView } from './pages/HistoryView';
import { CompareView } from './pages/CompareView';
import { AlertsView } from './pages/AlertsView';
import { SettingsView } from './pages/SettingsView';
import { RuntimeConfigSettings } from './components/RuntimeConfigSettings';
import { TrendDetailModal } from './components/TrendDetailModal';
import { ExportModal } from './components/ExportModal';
import { TrendingSearch, AiUsageStats } from './types';
import { getClientId, getApiHeaders } from './utils/clientId';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('dashboard');
  const [selectedRegion, setSelectedRegion] = useState<string>('ID');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try { return localStorage.getItem('ai_trend_category') || 'Technology'; } catch { return 'Technology'; }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [trends, setTrends] = useState<TrendingSearch[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [savedTrends, setSavedTrends] = useState<TrendingSearch[]>(() => {
    try { const saved = localStorage.getItem('ai_trend_saved'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [selectedTrend, setSelectedTrend] = useState<TrendingSearch | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportTrendsData, setExportTrendsData] = useState<TrendingSearch[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageStats | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { const saved = localStorage.getItem('ai_trend_theme'); if (saved) return saved === 'dark'; return true; } catch { return true; }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenExport = useCallback((customList?: TrendingSearch[]) => {
    setExportTrendsData(customList && customList.length > 0 ? customList : trends);
    setIsExportOpen(true);
  }, [trends]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.classList.add('dark'); localStorage.setItem('ai_trend_theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('ai_trend_theme', 'light'); }
  }, [darkMode]);

  useEffect(() => {
    try { localStorage.setItem('ai_trend_saved', JSON.stringify(savedTrends)); } catch { /* ignore persistence errors */ }
  }, [savedTrends]);

  const fetchTrends = useCallback(async (force = false) => {
    setLoadingTrends(true);
    setTrendError(null);
    try {
      const queryParams = new URLSearchParams({ region: selectedRegion, timeframe: selectedTimeframe, limit: '10', refresh: force ? 'true' : 'false' });
      const res = await fetch(`/api/trending?${queryParams.toString()}`);
      const data = await res.json();
      if (!res.ok && !data.data?.length) throw new Error(data.error || 'Failed to fetch trending searches');
      setTrends(data.data || []);
      if (data.warning) setTrendError(`Note: ${data.warning}`);
    } catch (err: any) {
      setTrendError(err.message || 'Unable to retrieve live trends.');
    } finally { setLoadingTrends(false); }
  }, [selectedRegion, selectedTimeframe]);

  const fetchAiUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-usage', {
        headers: getApiHeaders(),
      });
      const json = await res.json();
      if (json.success) setAiUsage(json.data);
    } catch (e) { console.error('Failed to fetch AI usage stats:', e); }
  }, []);

  const fetchSavedTrends = useCallback(async () => {
    try {
      const clientId = getClientId();
      const res = await fetch('/api/saved-trends', {
        headers: { 'x-client-id': clientId },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSavedTrends(json.data);
        }
      }
    } catch (e) {
      console.debug('Using local saved trends fallback:', e);
    }
  }, []);

  useEffect(() => {
    fetchTrends(false);
    fetchAiUsage();
    fetchSavedTrends();
  }, [fetchTrends, fetchAiUsage, fetchSavedTrends]);

  const handleToggleSave = useCallback((trend: TrendingSearch) => {
    const clientId = getClientId();
    const isAlreadySaved = savedTrends.some((s) => s.id === trend.id);

    if (isAlreadySaved) {
      setSavedTrends(prev => prev.filter((s) => s.id !== trend.id));
      showToast(`Removed "${trend.keyword}" from saved trends`);

      fetch(`/api/saved-trends?id=${encodeURIComponent(trend.id)}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId },
      }).catch((e) => console.debug('Saved trend delete sync:', e));
      return;
    }

    setSavedTrends(prev => [trend, ...prev.filter(s => s.id !== trend.id)]);
    showToast(`Saved "${trend.keyword}" to bookmarks`);

    fetch('/api/saved-trends', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
      },
      body: JSON.stringify({ trend }),
    }).catch((e) => console.debug('Saved trend add sync:', e));
  }, [savedTrends, showToast]);

  const handleRemoveSaved = useCallback((id: string) => {
    const clientId = getClientId();
    setSavedTrends(prev => prev.filter(s => s.id !== id));
    showToast('Trend removed from saved');

    fetch(`/api/saved-trends?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-client-id': clientId },
    }).catch((e) => console.debug('Saved trend delete sync:', e));
  }, [showToast]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-600/15 dark:bg-blue-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[45%] left-[25%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      {toastMessage && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 dark:bg-white/10 text-white dark:text-slate-100 text-xs font-semibold shadow-2xl border border-white/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span>{toastMessage}</span></div>}
      <Sidebar currentView={currentView} onSelectView={setCurrentView} savedCount={savedTrends.length} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} isOpenMobile={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar onOpenMobile={() => setMobileSidebarOpen(true)} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} selectedTimeframe={selectedTimeframe} onSelectTimeframe={setSelectedTimeframe} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} onRefresh={() => fetchTrends(true)} loading={loadingTrends} aiUsage={aiUsage} trends={trends} onShowToast={showToast} onOpenExport={() => handleOpenExport(trends)} onOpenSettings={() => setCurrentView('settings')} />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && <DashboardView trends={trends} loading={loadingTrends} error={trendError} selectedRegion={selectedRegion} selectedCategory={selectedCategory} savedTrends={savedTrends} onSelectTrend={setSelectedTrend} onToggleSave={handleToggleSave} onRefresh={() => fetchTrends(true)} onSelectCategory={setSelectedCategory} />}
          {currentView === 'trending' && <TrendingView trends={trends} loading={loadingTrends} selectedRegion={selectedRegion} savedTrends={savedTrends} onSelectTrend={setSelectedTrend} onToggleSave={handleToggleSave} onShowToast={showToast} onOpenExport={handleOpenExport} />}
          {currentView === 'saved' && <SavedView savedTrends={savedTrends} onSelectTrend={setSelectedTrend} onRemoveSaved={handleRemoveSaved} onShowToast={showToast} onOpenExport={handleOpenExport} />}
          {currentView === 'history' && <HistoryView currentTrends={trends} selectedRegion={selectedRegion} onSelectTrend={setSelectedTrend} />}
          {currentView === 'compare' && <CompareView trends={trends} onSelectTrend={setSelectedTrend} />}
          {currentView === 'alerts' && <AlertsView currentTrends={trends} onSelectTrend={setSelectedTrend} onShowToast={showToast} />}
          {currentView === 'settings' && <div className="space-y-6"><RuntimeConfigSettings /><SettingsView /></div>}
        </main>
      </div>
      {selectedTrend && <TrendDetailModal trend={selectedTrend} onClose={() => setSelectedTrend(null)} onSaveToggle={handleToggleSave} isSaved={savedTrends.some((s) => s.id === selectedTrend.id)} onRefreshUsage={fetchAiUsage} onOpenSettings={() => { setSelectedTrend(null); setCurrentView('settings'); }} />}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} trends={exportTrendsData.length > 0 ? exportTrendsData : trends} region={selectedRegion} category={selectedCategory} onShowToast={showToast} />
    </div>
  );
}
