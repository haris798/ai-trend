-- =========================================================
-- AI TREND RESEARCH - SUPABASE INITIAL SCHEMA MIGRATION
-- Database Schema for Serverless Deployment (Vercel / Cloudflare)
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TRENDS TABLE
CREATE TABLE IF NOT EXISTS trends (
    id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
    rank INTEGER NOT NULL,
    region TEXT NOT NULL,
    category TEXT DEFAULT 'All',
    traffic TEXT DEFAULT '10K+',
    trend_direction TEXT DEFAULT 'up' CHECK (trend_direction IN ('up', 'down', 'stable')),
    trend_percentage TEXT,
    source TEXT DEFAULT 'Google Trends',
    source_url TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trends_keyword ON trends(keyword);
CREATE INDEX IF NOT EXISTS idx_trends_region ON trends(region);
CREATE INDEX IF NOT EXISTS idx_trends_timestamp ON trends(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trends_created_at ON trends(created_at DESC);

-- 2. TREND_ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS trend_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id TEXT REFERENCES trends(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    region TEXT NOT NULL,
    search_intent TEXT,
    trend_type TEXT,
    audience TEXT,
    why_trending TEXT,
    longevity TEXT,
    competition TEXT,
    commercial_intent TEXT,
    content_potential INTEGER DEFAULT 0 CHECK (content_potential BETWEEN 0 AND 100),
    monetization_potential INTEGER DEFAULT 0 CHECK (monetization_potential BETWEEN 0 AND 100),
    trend_momentum INTEGER DEFAULT 0 CHECK (trend_momentum BETWEEN 0 AND 100),
    opportunity_score INTEGER DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
    is_ai_estimate BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_analysis_trend_id ON trend_analysis(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_keyword ON trend_analysis(keyword);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_region ON trend_analysis(region);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_created_at ON trend_analysis(created_at DESC);

-- 3. KEYWORD_IDEAS TABLE
CREATE TABLE IF NOT EXISTS keyword_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id TEXT REFERENCES trends(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    keyword_type TEXT NOT NULL CHECK (keyword_type IN ('related', 'long_tail', 'question', 'commercial', 'low_competition')),
    source TEXT DEFAULT 'Gemini AI',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_ideas_trend_id ON keyword_ideas(trend_id);
CREATE INDEX IF NOT EXISTS idx_keyword_ideas_keyword ON keyword_ideas(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_ideas_type ON keyword_ideas(keyword_type);

-- 4. CONTENT_IDEAS TABLE
CREATE TABLE IF NOT EXISTS content_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id TEXT REFERENCES trends(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('blog', 'youtube', 'tiktok', 'pinterest', 'kdp')),
    title TEXT NOT NULL,
    hook TEXT,
    content_angle TEXT,
    target_audience TEXT,
    monetization TEXT,
    is_ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_ideas_trend_id ON content_ideas(trend_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_platform ON content_ideas(platform);

-- 5. SAVED_TRENDS TABLE
CREATE TABLE IF NOT EXISTS saved_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id TEXT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trend_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_trends_trend_id ON saved_trends(trend_id);
CREATE INDEX IF NOT EXISTS idx_saved_trends_created_at ON saved_trends(created_at DESC);

-- 6. TREND_HISTORY TABLE
CREATE TABLE IF NOT EXISTS trend_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL,
    region TEXT NOT NULL,
    rank INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_history_keyword ON trend_history(keyword);
CREATE INDEX IF NOT EXISTS idx_trend_history_region ON trend_history(region);
CREATE INDEX IF NOT EXISTS idx_trend_history_timestamp ON trend_history(timestamp DESC);

-- 7. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL,
    region TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    last_detected_rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_keyword ON alerts(keyword);
CREATE INDEX IF NOT EXISTS idx_alerts_region ON alerts(region);

-- 8. AI_USAGE TABLE
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation TEXT NOT NULL,
    keyword TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage(operation);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

-- Enable RLS for all tables
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Anonymous public read-only access for public trend data & ideas
CREATE POLICY "Public read trends" ON trends FOR SELECT USING (true);
CREATE POLICY "Public insert trends" ON trends FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update trends" ON trends FOR UPDATE USING (true);

CREATE POLICY "Public read trend_analysis" ON trend_analysis FOR SELECT USING (true);
CREATE POLICY "Public insert trend_analysis" ON trend_analysis FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read keyword_ideas" ON keyword_ideas FOR SELECT USING (true);
CREATE POLICY "Public insert keyword_ideas" ON keyword_ideas FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read content_ideas" ON content_ideas FOR SELECT USING (true);
CREATE POLICY "Public insert content_ideas" ON content_ideas FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read saved_trends" ON saved_trends FOR SELECT USING (true);
CREATE POLICY "Public insert saved_trends" ON saved_trends FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete saved_trends" ON saved_trends FOR DELETE USING (true);

CREATE POLICY "Public read trend_history" ON trend_history FOR SELECT USING (true);
CREATE POLICY "Public insert trend_history" ON trend_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Public insert alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update alerts" ON alerts FOR UPDATE USING (true);
CREATE POLICY "Public delete alerts" ON alerts FOR DELETE USING (true);

CREATE POLICY "Public read ai_usage" ON ai_usage FOR SELECT USING (true);
CREATE POLICY "Public insert ai_usage" ON ai_usage FOR INSERT WITH CHECK (true);
