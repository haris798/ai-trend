import React from 'react';
import { Sparkles, Trophy, ArrowRight, Zap, Target } from 'lucide-react';
import { TrendingSearch } from '../types';
import { OpportunityScoreBadge } from './OpportunityScoreBadge';

interface Props {
  trends: TrendingSearch[];
  onSelectTrend: (trend: TrendingSearch) => void;
}

export const BestOpportunities: React.FC<Props> = ({ trends, onSelectTrend }) => {
  // Filter and sort top 5 trends by opportunity score or rank
  const bestTrends = [...trends]
    .sort((a, b) => (b.opportunity_score ?? (100 - b.rank * 5)) - (a.opportunity_score ?? (100 - a.rank * 5)))
    .slice(0, 5);

  const getPlatformRecommendation = (category: string) => {
    switch (category) {
      case 'Technology':
        return { platform: 'YouTube / Blog', content: 'In-depth Tutorial & Tool Review', monetization: 'Affiliate & Software Sponsorship' };
      case 'Finance':
        return { platform: 'Newsletter / KDP', content: 'Actionable Investment Guide & Sheet', monetization: 'Paid Newsletter & Digital Guide' };
      case 'Entertainment':
        return { platform: 'TikTok / YouTube', content: 'Reaction, Lore Breakdown & Trends', monetization: 'Creator Ads & Merch' };
      case 'Sports':
        return { platform: 'YouTube / Blog', content: 'Match Tactics & Highlights Analysis', monetization: 'Display Ads & Sports Fan Gear' };
      default:
        return { platform: 'Blog / Pinterest', content: 'How-to Guide & Curated Tips', monetization: 'Affiliate Links & Ad Placements' };
    }
  };

  return (
    <div id="best-opportunities-section" className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 mb-8 shadow-xl">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Best Opportunities
              <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                AI RANKED
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Top 5 high-potential trending topics optimized for creator reach and monetization.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {bestTrends.map((item, idx) => {
          const rec = getPlatformRecommendation(item.category);
          const score = item.opportunity_score ?? Math.max(70, 96 - idx * 4);

          return (
            <div
              key={item.id}
              id={`best-opp-${idx + 1}`}
              onClick={() => onSelectTrend(item)}
              className="p-3.5 rounded-xl border border-white/10 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1} Best Pick</span>
                  <OpportunityScoreBadge score={score} size="sm" isAiEstimate={true} />
                </div>

                <h3 className="font-bold text-sm text-white line-clamp-1 mb-2 hover:text-indigo-300 transition-colors">
                  {item.keyword}
                </h3>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Recommended Platform</span>
                    <span className="font-medium text-slate-300 flex items-center gap-1">
                      <Target className="w-3 h-3 text-indigo-400" />
                      {rec.platform}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Content Strategy</span>
                    <span className="text-slate-300 line-clamp-1 text-[11px]">
                      {rec.content}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Monetization Angle</span>
                    <span className="text-emerald-400 font-medium text-[11px] line-clamp-1">
                      {rec.monetization}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                <span className="text-[11px] font-mono text-slate-400">Lifespan: 1-2 wks</span>
                <span className="flex items-center gap-0.5">
                  Analyze <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
