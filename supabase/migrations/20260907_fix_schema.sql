-- Align the initial schema with the application cache and secure server-managed writes.

alter table public.trends add column if not exists timeframe text not null default '24h';
alter table public.trend_history add column if not exists timeframe text not null default '24h';

create index if not exists idx_trends_region_timeframe_created
  on public.trends(region, timeframe, created_at desc);

create index if not exists idx_history_region_timeframe_timestamp
  on public.trend_history(region, timeframe, timestamp desc);

-- Remove permissive anonymous write policies from the original schema.
drop policy if exists "Public insert trends" on public.trends;
drop policy if exists "Public update trends" on public.trends;
drop policy if exists "Public insert trend_analysis" on public.trend_analysis;
drop policy if exists "Public insert keyword_ideas" on public.keyword_ideas;
drop policy if exists "Public insert content_ideas" on public.content_ideas;
drop policy if exists "Public insert saved_trends" on public.saved_trends;
drop policy if exists "Public delete saved_trends" on public.saved_trends;
drop policy if exists "Public insert trend_history" on public.trend_history;
drop policy if exists "Public insert alerts" on public.alerts;
drop policy if exists "Public update alerts" on public.alerts;
drop policy if exists "Public delete alerts" on public.alerts;
drop policy if exists "Public insert ai_usage" on public.ai_usage;

-- Remove public reads for server-only operational data.
drop policy if exists "Public read ai_usage" on public.ai_usage;
