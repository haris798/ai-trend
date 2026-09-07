import { TrendingSearch, TrendAnalysis, AiUsageStats } from '../../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TRENDS_TTL_MS = 5 * 60 * 1000;
const ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> { data: T; timestamp: number; }

const memoryCache = {
  trending: new Map<string, CacheEntry<TrendingSearch[]>>(),
  analysis: new Map<string, CacheEntry<TrendAnalysis>>(),
  aiUsageToday: { analyses: 0, contentGenerations: 0, tokens: 0, date: new Date().toISOString().slice(0, 10) },
};

let cachedSupabaseClient: SupabaseClient | null = null;
let cachedSupabaseConfigKey = '';
const missingTables = new Map<string, number>();
const TABLE_RECHECK_COOLDOWN_MS = 5 * 60 * 1000;

export function isTableMissing(tableName: string): boolean {
  const lastChecked = missingTables.get(tableName);
  if (!lastChecked) return false;
  if (Date.now() - lastChecked > TABLE_RECHECK_COOLDOWN_MS) {
    missingTables.delete(tableName);
    return false;
  }
  return true;
}

export function recordTableMissing(tableName: string): void {
  missingTables.set(tableName, Date.now());
}

export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error.message || '';
  const code = error.code || '';
  return code === 'PGRST205' || msg.includes('Could not find the table') || msg.includes('in the schema cache') || (msg.includes('relation') && msg.includes('does not exist'));
}

function getServerSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url === 'https://your-project.supabase.co' || key === 'your-service-role-key') return null;

  const configKey = `${url}:${key.slice(0, 12)}`;
  if (cachedSupabaseClient && cachedSupabaseConfigKey === configKey) return cachedSupabaseClient;

  try {
    cachedSupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    cachedSupabaseConfigKey = configKey;
    return cachedSupabaseClient;
  } catch {
    return null;
  }
}

export class CacheService {
  static getTrendingKey(region: string, timeframe: string): string {
    return `trending:${(region || 'ID').toUpperCase()}:${timeframe || '24h'}`;
  }

  static getAnalysisKey(keyword: string, region: string): string {
    return `analysis:${keyword.trim().toLowerCase()}:${(region || 'ID').toUpperCase()}`;
  }

  static async getTrending(region: string, timeframe: string): Promise<TrendingSearch[] | null> {
    const normalizedRegion = (region || 'ID').toUpperCase();
    const normalizedTimeframe = timeframe || '24h';
    const key = this.getTrendingKey(normalizedRegion, normalizedTimeframe);

    const mem = memoryCache.trending.get(key);
    if (mem && Date.now() - mem.timestamp < TRENDS_TTL_MS) return mem.data;

    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing('trends')) return null;

    try {
      const cutoff = new Date(Date.now() - TRENDS_TTL_MS).toISOString();
      const { data, error } = await supabase
        .from('trends')
        .select('*')
        .eq('region', normalizedRegion)
        .eq('timeframe', normalizedTimeframe)
        .gte('created_at', cutoff)
        .order('rank', { ascending: true })
        .limit(10);

      if (error) {
        if (isTableMissingError(error)) recordTableMissing('trends');
        else console.warn('[CacheService] getTrending:', error.message);
        return null;
      }
      if (!data?.length) return null;

      const formatted: TrendingSearch[] = data.map((d: any) => ({
        id: d.id,
        keyword: d.keyword,
        rank: d.rank,
        region: d.region,
        category: d.category || 'General',
        traffic: d.traffic || '',
        trend_direction: d.trend_direction || 'up',
        trend_percentage: d.trend_percentage || undefined,
        source: d.source || 'Google Trends',
        source_url: d.source_url,
        timestamp: d.timestamp,
        created_at: d.created_at,
      }));
      memoryCache.trending.set(key, { data: formatted, timestamp: Date.now() });
      return formatted;
    } catch (error: any) {
      if (isTableMissingError(error)) recordTableMissing('trends');
      return null;
    }
  }

  static async setTrending(region: string, timeframe: string, data: TrendingSearch[]): Promise<void> {
    const normalizedRegion = (region || 'ID').toUpperCase();
    const normalizedTimeframe = timeframe || '24h';
    const key = this.getTrendingKey(normalizedRegion, normalizedTimeframe);
    memoryCache.trending.set(key, { data, timestamp: Date.now() });

    const supabase = getServerSupabaseClient();
    if (!supabase || !data.length || isTableMissing('trends')) return;

    try {
      const rows = data.map(item => ({
        id: item.id,
        keyword: item.keyword,
        rank: item.rank,
        region: item.region,
        timeframe: normalizedTimeframe,
        category: item.category,
        traffic: item.traffic || null,
        trend_direction: item.trend_direction,
        trend_percentage: item.trend_percentage || null,
        source: item.source,
        source_url: item.source_url,
        timestamp: item.timestamp,
        created_at: item.created_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from('trends').upsert(rows, { onConflict: 'id' });
      if (error && isTableMissingError(error)) recordTableMissing('trends');

      if (!isTableMissing('trend_history')) {
        const historyRows = data.map(item => ({
          keyword: item.keyword,
          region: item.region,
          timeframe: normalizedTimeframe,
          rank: item.rank,
          timestamp: new Date().toISOString(),
        }));
        const { error: historyError } = await supabase.from('trend_history').insert(historyRows);
        if (historyError && isTableMissingError(historyError)) recordTableMissing('trend_history');
      }
    } catch (error: any) {
      if (!isTableMissingError(error)) console.warn('[CacheService] setTrending:', error.message || error);
    }
  }

  static async getAnalysis(keyword: string, region: string): Promise<TrendAnalysis | null> {
    const normalizedKeyword = (keyword || '').trim();
    const normalizedRegion = (region || 'ID').toUpperCase();
    const key = this.getAnalysisKey(normalizedKeyword, normalizedRegion);
    const mem = memoryCache.analysis.get(key);
    if (mem && Date.now() - mem.timestamp < ANALYSIS_TTL_MS) return mem.data;

    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing('trend_analysis')) return null;

    try {
      const cutoff = new Date(Date.now() - ANALYSIS_TTL_MS).toISOString();
      const { data, error } = await supabase.from('trend_analysis')
        .select('*').ilike('keyword', normalizedKeyword).eq('region', normalizedRegion)
        .gte('created_at', cutoff).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) recordTableMissing('trend_analysis');
        return null;
      }
      if (!data) return null;
      const analysis: TrendAnalysis = {
        id: data.id, trend_id: data.trend_id, keyword: data.keyword, region: data.region,
        search_intent: data.search_intent, trend_type: data.trend_type, audience: data.audience,
        why_trending: data.why_trending, longevity: data.longevity, competition: data.competition,
        commercial_intent: data.commercial_intent, content_potential: data.content_potential,
        monetization_potential: data.monetization_potential, trend_momentum: data.trend_momentum,
        opportunity_score: data.opportunity_score, is_ai_estimate: data.is_ai_estimate ?? true,
        created_at: data.created_at,
      };
      const createdTime = new Date(data.created_at).getTime();
      memoryCache.analysis.set(key, { data: analysis, timestamp: Number.isFinite(createdTime) ? createdTime : Date.now() });
      return analysis;
    } catch (error: any) {
      if (!isTableMissingError(error)) console.warn('[CacheService] getAnalysis:', error.message || error);
      return null;
    }
  }

  static async setAnalysis(analysis: TrendAnalysis): Promise<void> {
    const keyword = (analysis.keyword || '').trim();
    const region = (analysis.region || 'ID').toUpperCase();
    const key = this.getAnalysisKey(keyword, region);
    memoryCache.analysis.set(key, { data: analysis, timestamp: Date.now() });

    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing('trend_analysis')) return;

    try {
      const row = {
        trend_id: analysis.trend_id || null,
        keyword, region,
        search_intent: analysis.search_intent,
        trend_type: analysis.trend_type,
        audience: analysis.audience,
        why_trending: analysis.why_trending,
        longevity: analysis.longevity,
        competition: analysis.competition,
        commercial_intent: analysis.commercial_intent,
        content_potential: analysis.content_potential,
        monetization_potential: analysis.monetization_potential,
        trend_momentum: analysis.trend_momentum,
        opportunity_score: analysis.opportunity_score,
        is_ai_estimate: true,
        created_at: analysis.created_at || new Date().toISOString(),
      };
      const { error } = await supabase.from('trend_analysis').insert(row);
      if (error && isTableMissingError(error)) recordTableMissing('trend_analysis');
    } catch (error: any) {
      if (!isTableMissingError(error)) console.warn('[CacheService] setAnalysis:', error.message || error);
    }
  }

  static async attachCachedAnalysisScores(trends: TrendingSearch[]): Promise<TrendingSearch[]> {
    if (!trends?.length) return trends;
    const result = trends.map(t => ({ ...t }));
    const supabase = getServerSupabaseClient();
    const cutoff = new Date(Date.now() - ANALYSIS_TTL_MS).toISOString();
    const scoreMap = new Map<string, number>();

    for (const trend of result) {
      const mem = memoryCache.analysis.get(this.getAnalysisKey(trend.keyword, trend.region));
      if (mem && Date.now() - mem.timestamp < ANALYSIS_TTL_MS) scoreMap.set(`${trend.keyword.toLowerCase()}:${trend.region}`, mem.data.opportunity_score);
    }

    if (supabase && !isTableMissing('trend_analysis')) {
      try {
        const keywords = result.map(t => t.keyword.trim());
        const { data, error } = await supabase.from('trend_analysis')
          .select('keyword,region,opportunity_score,created_at')
          .in('keyword', keywords).gte('created_at', cutoff);
        if (!error && data) {
          for (const row of data) scoreMap.set(`${row.keyword.toLowerCase()}:${(row.region || 'ID').toUpperCase()}`, row.opportunity_score);
        } else if (error && isTableMissingError(error)) recordTableMissing('trend_analysis');
      } catch (error: any) {
        if (!isTableMissingError(error)) console.warn('[CacheService] attachCachedAnalysisScores:', error.message || error);
      }
    }

    return result.map(t => {
      const score = scoreMap.get(`${t.keyword.toLowerCase()}:${(t.region || 'ID').toUpperCase()}`);
      return score === undefined ? t : { ...t, opportunity_score: score, is_ai_estimate: true };
    });
  }

  static async recordAiUsage(operation: 'analysis' | 'content_generation' | 'kdp' | 'keywords', keyword: string, tokens = 800): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if (memoryCache.aiUsageToday.date !== today) memoryCache.aiUsageToday = { analyses: 0, contentGenerations: 0, tokens: 0, date: today };
    if (operation === 'analysis') memoryCache.aiUsageToday.analyses += 1;
    else memoryCache.aiUsageToday.contentGenerations += 1;
    memoryCache.aiUsageToday.tokens += tokens;

    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing('ai_usage')) return;
    try {
      const { error } = await supabase.from('ai_usage').insert({ operation, keyword, tokens_used: tokens });
      if (error && isTableMissingError(error)) recordTableMissing('ai_usage');
    } catch (error: any) {
      if (!isTableMissingError(error)) console.warn('[CacheService] recordAiUsage:', error.message || error);
    }
  }

  static async getAiUsageStats(): Promise<AiUsageStats> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing('ai_usage')) {
      try {
        const { data, error } = await supabase.from('ai_usage').select('operation,tokens_used').gte('created_at', startOfToday.toISOString());
        if (!error && data) {
          return {
            todayAnalyses: data.filter(x => x.operation === 'analysis').length,
            todayContentGenerations: data.filter(x => x.operation !== 'analysis').length,
            totalTokens: data.reduce((sum, x) => sum + (x.tokens_used || 0), 0),
            lastUpdated: new Date().toISOString(),
          };
        }
        if (error && isTableMissingError(error)) recordTableMissing('ai_usage');
      } catch (error: any) {
        if (!isTableMissingError(error)) console.warn('[CacheService] getAiUsageStats:', error.message || error);
      }
    }
    return {
      todayAnalyses: memoryCache.aiUsageToday.analyses,
      todayContentGenerations: memoryCache.aiUsageToday.contentGenerations,
      totalTokens: memoryCache.aiUsageToday.tokens,
      lastUpdated: new Date().toISOString(),
    };
  }

  static async getDatabaseStatus(): Promise<{ configured: boolean; connected: boolean; schemaReady: boolean; missingTables: string[]; usingMemoryFallback: boolean }> {
    const supabase = getServerSupabaseClient();
    if (!supabase) return { configured: false, connected: false, schemaReady: false, missingTables: [], usingMemoryFallback: true };
    const tables = ['trends', 'trend_analysis', 'keyword_ideas', 'content_ideas', 'saved_trends', 'trend_history', 'alerts', 'ai_usage'];
    const missing: string[] = [];
    for (const table of tables) {
      if (isTableMissing(table)) { missing.push(table); continue; }
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) { if (isTableMissingError(error)) { recordTableMissing(table); missing.push(table); } }
      } catch { recordTableMissing(table); missing.push(table); }
    }
    return { configured: true, connected: true, schemaReady: missing.length === 0, missingTables: missing, usingMemoryFallback: missing.length > 0 };
  }
}
