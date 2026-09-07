import React from 'react';
import {
  Flame, LayoutDashboard, Bookmark, History, GitCompare,
  Bell, Settings, Moon, Sun, Sparkles, Database, ShieldCheck
} from 'lucide-react';

export type PageView = 'dashboard' | 'trending' | 'saved' | 'history' | 'compare' | 'alerts' | 'settings';

interface Props {
  currentView: PageView;
  onSelectView: (view: PageView) => void;
  savedCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentView,
  onSelectView,
  savedCount,
  darkMode,
  onToggleDarkMode,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as PageView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trending' as PageView, label: 'Trending Searches', icon: Flame, badge: 'Top 10' },
    { id: 'saved' as PageView, label: 'Saved Trends', icon: Bookmark, count: savedCount },
    { id: 'history' as PageView, label: 'Trend History', icon: History },
    { id: 'compare' as PageView, label: 'Compare Trends', icon: GitCompare },
    { id: 'alerts' as PageView, label: 'Keyword Alerts', icon: Bell },
    { id: 'settings' as PageView, label: 'Architecture & Docs', icon: Settings },
  ];

  const handleNavClick = (view: PageView) => {
    onSelectView(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white/75 dark:bg-white/[0.04] backdrop-blur-xl border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Brand */}
          <div className="p-5 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  <span>TREND RESEARCH</span>
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase">
                  PHASE 1 ACTIVE
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-500/10 dark:bg-white/10 text-indigo-600 dark:text-white font-bold border border-indigo-500/20 dark:border-white/15 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}

                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold border border-slate-300/40 dark:border-white/10">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / Serverless Status & Dark Mode Toggle */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 space-y-3">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] space-y-1.5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Database className="w-3 h-3 text-emerald-500" />
                <span>Supabase</span>
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Gemini 3.8</span>
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-500/20">Flash</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Appearance</span>
            <button
              id="btn-toggle-dark-mode"
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
