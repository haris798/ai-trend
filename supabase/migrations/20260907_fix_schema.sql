-- Align the schema with the application cache and secure server-managed writes.

alter table public.trends add column if not exists timeframe text not null default '24h';
alter table public.trend_history add column if not exists timeframe text not null default '24h';

alter table public.saved_trends add column if not exists client_id text;
alter table public.saved_trends add column if not exists trend_data jsonb;
alter table public.alerts add column if not exists client_id text;
alter table public.alerts add column if not exists target_rank integer not null default 10;
alter table public.alerts add column if not exists created_at timestamptz not null default now();

create index if not exists idx_trends_region_timeframe_created
  on public.trends(region, timeframe, created_at desc);
create index if not exists idx_history_region_timeframe_timestamp
  on public.trend_history(region, timeframe, timestamp desc);
create index if not exists idx_saved_trends_client_id
  on public.saved_trends(client_id);
create index if not exists idx_alerts_client_id
  on public.alerts(client_id);

-- Anonymous saved data is isolated by browser client ID, not globally by trend ID.
alter table public.saved_trends drop constraint if exists saved_trends_trend_id_key;
create unique index if not exists idx_saved_trends_client_trend_unique
  on public.saved_trends(client_id, trend_id);

-- Remove permissive anonymous write policies. Server APIs use the service role.
drop policy if exists "Public insert trends" on public.trends;
drop policy if exists "Public update trends" on public.trends;
drop policy if exists "Public insert trend_analysis" on public.trend_analysis;
drop policy if exists "Public insert keyword_ideas" on public.keyword_ideas;
drop policy if exists "Public insert content_ideas" on public.content_ideas;
drop policy if exists "Public insert saved_trends" on public.saved_trends;
drop policy if exists "Public update saved_trends" on public.saved_trends;
drop policy if exists "Public delete saved_trends" on public.saved_trends;
drop policy if exists "Public insert trend_history" on public.trend_history;
drop policy if exists "Public insert alerts" on public.alerts;
drop policy if exists "Public update alerts" on public.alerts;
drop policy if exists "Public delete alerts" on public.alerts;
drop policy if exists "Public insert ai_usage" on public.ai_usage;

-- Saved trends and alerts are private to the server API; public reads are disabled.
drop policy if exists "Public read saved_trends" on public.saved_trends;
drop policy if exists "Public read alerts" on public.alerts;
drop policy if exists "Public read ai_usage" on public.ai_usage;
