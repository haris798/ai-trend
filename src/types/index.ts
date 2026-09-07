export type TrendDirection = 'up' | 'down' | 'stable';

export type KeywordType = 'related' | 'long_tail' | 'question' | 'commercial' | 'low_competition';

export type ContentPlatform = 'blog' | 'youtube' | 'tiktok' | 'pinterest' | 'kdp';

export interface TrendingSearch {
  id: string;
  keyword: string;
  rank: number;
  region: string;
  category: string;
  traffic: string;
  trend_direction: TrendDirection;
  trend_percentage?: string;
  source: string;
  source_url?: string;
  timestamp: string;
  created_at: string;
  news_title?: string;
  image_url?: string;
  opportunity_score?: number;
  is_ai_estimate?: boolean;
}

export interface TrendAnalysis {
  id?: string;
  trend_id?: string;
  keyword: string;
  region: string;
  search_intent: string;
  trend_type: string;
  audience: string;
  why_trending: string;
  longevity: string;
  competition: string;
  commercial_intent: string;
  content_potential: number; // 0-100
  monetization_potential: number; // 0-100
  trend_momentum: number; // 0-100
  opportunity_score: number; // 0-100
  is_ai_estimate: boolean;
  created_at?: string;
}

export interface KeywordIdea {
  id?: string;
  trend_id?: string;
  keyword: string;
  keyword_type: KeywordType;
  source: string;
  created_at?: string;
}

export interface ContentIdeaItem {
  id?: string;
  trend_id?: string;
  platform: ContentPlatform;
  title: string;
  hook?: string;
  content_angle: string;
  target_audience: string;
  monetization: string;
  is_ai_generated: boolean;
  created_at?: string;
}

export interface KdpAnalysisResult {
  kdpPotential: number; // 0-100
  bookType: string;
  targetAudience: string;
  niche: string;
  competition: string;
  evergreenPotential: number; // 0-100
  concepts: Array<{
    title: string;
    subtitle: string;
    bookType: string;
    description: string;
    outline: string[];
    monetizationTip: string;
  }>;
}

export interface MonetizationChannel {
  channel: 'Affiliate' | 'Ads' | 'Digital Product' | 'KDP' | 'YouTube' | 'Newsletter' | 'Services';
  score: number; // 0-100
  recommendation: string;
  actionableSteps: string[];
}

export interface TrendHistoryRecord {
  id: string;
  keyword: string;
  region: string;
  rank: number;
  previous_rank?: number;
  change?: 'up' | 'down' | 'same' | 'new';
  change_amount?: number;
  timestamp: string;
}

export interface TrendAlert {
  id: string;
  keyword: string;
  region: string;
  enabled: boolean;
  last_detected_rank?: number;
  created_at: string;
}

export interface AiUsageRecord {
  id?: string;
  operation: string;
  keyword: string;
  tokens_used: number;
  created_at: string;
}

export interface AiUsageStats {
  todayAnalyses: number;
  todayContentGenerations: number;
  totalTokens: number;
  lastUpdated: string;
}

export interface TrendingResponse {
  success: boolean;
  region: string;
  timeframe: string;
  source: string;
  updatedAt: string;
  cached?: boolean;
  data: TrendingSearch[];
  error?: string;
}
