import { TrendingSearch, TrendAnalysis, AiUsageStats } from '../../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TRENDS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = {
  trending: new Map<string, CacheEntry<TrendingSearch[]>>(),
  analysis: new Map<string, CacheEntry<TrendAnalysis>>(),
  aiUsageToday: {
    analyses: 0,
    contentGenerations: 0,
    tokens: 0,
    date: new Date().toISOString().slice(0, 10),
  }
};

let cachedSupabaseClient: SupabaseClient | null = null;
let cachedSupabaseConfigKey = '';

// Track tables that are missing in Supabase schema cache to avoid repetitive failing requests and error logs
const missingTables = new Map<string, number>();
const TABLE_RECHECK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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
  if (!missingTables.has(tableName)) {
    console.info(`[CacheService] Table '${tableName}' is not present in Supabase schema cache yet. Seamlessly falling back to In-Memory tier.`);
  }
  missingTables.set(tableName, Date.now());
}

export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error.message || '';
  const code = error.code || '';
  return (
    code === 'PGRST205' ||
    msg.includes("Could not find the table") ||
    msg.includes("in the schema cache") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

function getServerSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url !== 'https://your-project.supabase.co' && key !== 'your-supabase-anon-key' && key !== 'your_anon_key_here') {
    const configKey = `${url}:${key.slice(0, 10)}`;
    if (cachedSupabaseClient && cachedSupabaseConfigKey === configKey) {
      return cachedSupabaseClient;
    }
    try {
      cachedSupabaseClient = createClient(url, key, {
        auth: { persistSession: false },
      });
      cachedSupabaseConfigKey = configKey;
      return cachedSupabaseClient;
    } catch {
      return null;
    }
  }
  return null;
}

export class CacheService {
  static getTrendingKey(region: string, timeframe: string): string {
    return `trending:${(region || 'ID').toUpperCase()}:${timeframe || '24h'}`;
  }

  static getAnalysisKey(keyword: string, region: string): string {
    return `analysis:${keyword.trim().toLowerCase()}:${(region || 'ID').toUpperCase()}`;
  }

  // --- TRENDING CACHE ---
  static async getTrending(region: string, timeframe: string): Promise<TrendingSearch[] | null> {
    const key = this.getTrendingKey(region, timeframe);

    // 1. Check in-memory fast tier
    const mem = memoryCache.trending.get(key);
    if (mem && (Date.now() - mem.timestamp < TRENDS_TTL_MS)) {
      return mem.data;
    }

    // 2. Check Supabase cache if available and table exists
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing('trends')) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - TRENDS_TTL_MS).toISOString();
        const { data, error } = await supabase
          .from('trends')
          .select('*')
          .eq('region', region.toUpperCase())
          .gte('timestamp', fiveMinutesAgo)
          .order('rank', { ascending: true })
          .limit(10);

        if (error) {
          if (isTableMissingError(error)) {
            recordTableMissing('trends');
          }
        } else if (data && data.length > 0) {
          const formatted: TrendingSearch[] = data.map((d: any) => ({
            id: d.id,
            keyword: d.keyword,
            rank: d.rank,
            region: d.region,
            category: d.category || 'General',
            traffic: d.traffic || '10K+',
            trend_direction: d.trend_direction || 'up',
            trend_percentage: d.trend_percentage,
            source: d.source || 'Google Trends',
            source_url: d.source_url,
            timestamp: d.timestamp,
            created_at: d.created_at,
          }));

          // Populate memory cache
          memoryCache.trending.set(key, { data: formatted, timestamp: Date.now() });
          return formatted;
        }
      } catch (err: any) {
        if (isTableMissingError(err)) {
          recordTableMissing('trends');
        } else {
          console.warn('Supabase getTrending cache read failed:', err?.message || err);
        }
      }
    }

    return null;
  }

  static async setTrending(region: string, timeframe: string, data: TrendingSearch[]): Promise<void> {
    const key = this.getTrendingKey(region, timeframe);

    // Always update in-memory
    memoryCache.trending.set(key, { data, timestamp: Date.now() });

    // Store in Supabase if configured
    const supabase = getServerSupabaseClient();
    if (supabase && data.length > 0) {
      try {
        if (!isTableMissing('trends')) {
          const rows = data.map(item => ({
            id: item.id,
            keyword: item.keyword,
            rank: item.rank,
            region: item.region,
            category: item.category,
            traffic: item.traffic,
            trend_direction: item.trend_direction,
            trend_percentage: item.trend_percentage,
            source: item.source,
            source_url: item.source_url,
            timestamp: item.timestamp,
            created_at: item.created_at || new Date().toISOString(),
          }));

          const { error: upsertErr } = await supabase.from('trends').upsert(rows, { onConflict: 'id' });
          if (upsertErr && isTableMissingError(upsertErr)) {
            recordTableMissing('trends');
          }
        }

        // Record snapshot in trend_history
        if (!isTableMissing('trend_history')) {
          const historyRows = data.map(item => ({
            keyword: item.keyword,
            region: item.region,
            rank: item.rank,
            timestamp: new Date().toISOString(),
          }));
          const { error: histErr } = await supabase.from('trend_history').insert(historyRows);
          if (histErr && isTableMissingError(histErr)) {
            recordTableMissing('trend_history');
          }
        }
      } catch (err: any) {
        if (!isTableMissingError(err)) {
          console.warn('Supabase setTrending cache write failed:', err?.message || err);
        }
      }
    }
  }

  // --- GEMINI ANALYSIS CACHE (24h TTL) ---
  static async getAnalysis(keyword: string, region: string): Promise<TrendAnalysis | null> {
    const sanitizedKeyword = (keyword || '').trim();
    const sanitizedRegion = (region || 'ID').toUpperCase();
    const key = this.getAnalysisKey(sanitizedKeyword, sanitizedRegion);

    // 1. Check in-memory fast tier (24h TTL)
    const mem = memoryCache.analysis.get(key);
    if (mem && (Date.now() - mem.timestamp < ANALYSIS_TTL_MS)) {
      console.log(`[CacheService] Analysis cache HIT (In-Memory 24h) for "${sanitizedKeyword}" (${sanitizedRegion})`);
      return mem.data;
    }

    // 2. Check Supabase (24h TTL) if table exists
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing('trend_analysis')) {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - ANALYSIS_TTL_MS).toISOString();
        const { data, error } = await supabase
          .from('trend_analysis')
          .select('*')
          .ilike('keyword', sanitizedKeyword)
          .eq('region', sanitizedRegion)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          if (isTableMissingError(error)) {
            recordTableMissing('trend_analysis');
          } else {
            console.warn('[CacheService] Supabase getAnalysis error:', error.message);
          }
        } else if (data) {
          const analysis: TrendAnalysis = {
            id: data.id,
            trend_id: data.trend_id,
            keyword: data.keyword,
            region: data.region,
            search_intent: data.search_intent,
            trend_type: data.trend_type,
            audience: data.audience,
            why_trending: data.why_trending,
            longevity: data.longevity,
            competition: data.competition,
            commercial_intent: data.commercial_intent,
            content_potential: data.content_potential,
            monetization_potential: data.monetization_potential,
            trend_momentum: data.trend_momentum || 70,
            opportunity_score: data.opportunity_score,
            is_ai_estimate: data.is_ai_estimate ?? false,
            created_at: data.created_at,
          };

          // Cache in memory using the original creation time to preserve true TTL
          const createdTime = new Date(data.created_at).getTime();
          memoryCache.analysis.set(key, {
            data: analysis,
            timestamp: isNaN(createdTime) ? Date.now() : createdTime,
          });

          console.log(`[CacheService] Analysis cache HIT (Supabase 24h) for "${sanitizedKeyword}" (${sanitizedRegion}) - Cached at ${data.created_at}`);
          return analysis;
        } else {
          console.log(`[CacheService] Analysis cache MISS for "${sanitizedKeyword}" (${sanitizedRegion})`);
        }
      } catch (err: any) {
        if (isTableMissingError(err)) {
          recordTableMissing('trend_analysis');
        } else {
          console.warn('[CacheService] Supabase getAnalysis exception:', err?.message || err);
        }
      }
    }

    return null;
  }

  static async setAnalysis(analysis: TrendAnalysis): Promise<void> {
    const sanitizedKeyword = (analysis.keyword || '').trim();
    const sanitizedRegion = (analysis.region || 'ID').toUpperCase();
    const key = this.getAnalysisKey(sanitizedKeyword, sanitizedRegion);
    const now = Date.now();

    // Store in-memory
    memoryCache.analysis.set(key, { data: analysis, timestamp: now });

    // Store in Supabase if configured and table exists
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing('trend_analysis')) {
      try {
        let validTrendId: string | null = null;
        if (analysis.trend_id && !isTableMissing('trends')) {
          // Verify trend_id exists in trends table to avoid foreign key violation
          const { data: trendRow, error: trendErr } = await supabase
            .from('trends')
            .select('id')
            .eq('id', analysis.trend_id)
            .maybeSingle();
          if (trendErr && isTableMissingError(trendErr)) {
            recordTableMissing('trends');
          } else if (trendRow) {
            validTrendId = trendRow.id;
          }
        }

        const createdAt = analysis.created_at || new Date().toISOString();

        const { error } = await supabase.from('trend_analysis').insert({
          trend_id: validTrendId,
          keyword: sanitizedKeyword,
          region: sanitizedRegion,
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
          is_ai_estimate: analysis.is_ai_estimate,
          created_at: createdAt,
        });

        if (error) {
          if (isTableMissingError(error)) {
            recordTableMissing('trend_analysis');
          } else {
            console.warn('[CacheService] Supabase setAnalysis save error:', error.message);
          }
        } else {
          console.log(`[CacheService] Analysis successfully saved to Supabase (24h TTL) for "${sanitizedKeyword}" (${sanitizedRegion})`);
        }
      } catch (err: any) {
        if (isTableMissingError(err)) {
          recordTableMissing('trend_analysis');
        } else {
          console.warn('[CacheService] Supabase setAnalysis exception:', err?.message || err);
        }
      }
    }
  }

  // Batch helper: attach cached opportunity scores to trends
  static async attachCachedAnalysisScores(trends: TrendingSearch[]): Promise<TrendingSearch[]> {
    if (!trends || trends.length === 0) return trends;

    const supabase = getServerSupabaseClient();
    const twentyFourHoursAgo = new Date(Date.now() - ANALYSIS_TTL_MS).toISOString();

    try {
      // First check memory cache
      let updatedTrends = trends.map((t) => {
        const key = this.getAnalysisKey(t.keyword, t.region);
        const mem = memoryCache.analysis.get(key);
        if (mem && (Date.now() - mem.timestamp < ANALYSIS_TTL_MS)) {
          return {
            ...t,
            opportunity_score: mem.data.opportunity_score,
            is_ai_estimate: false,
          };
        }
        return t;
      });

      // Second check Supabase for any that don't have memory cache
      if (supabase && !isTableMissing('trend_analysis')) {
        const keywords = updatedTrends.map((t) => t.keyword.trim());
        const { data: dbAnalyses, error } = await supabase
          .from('trend_analysis')
          .select('keyword, region, opportunity_score, created_at')
          .in('keyword', keywords)
          .gte('created_at', twentyFourHoursAgo);

        if (error) {
          if (isTableMissingError(error)) {
            recordTableMissing('trend_analysis');
          }
        } else if (dbAnalyses && dbAnalyses.length > 0) {
          const scoreMap = new Map<string, number>();
          for (const item of dbAnalyses) {
            scoreMap.set(`${item.keyword.toLowerCase()}:${(item.region || 'ID').toUpperCase()}`, item.opportunity_score);
          }

          updatedTrends = updatedTrends.map((t) => {
            const cachedScore = scoreMap.get(`${t.keyword.toLowerCase()}:${(t.region || 'ID').toUpperCase()}`);
            if (cachedScore !== undefined) {
              return {
                ...t,
                opportunity_score: cachedScore,
                is_ai_estimate: false,
              };
            }
            return t;
          });
        }
      }

      return updatedTrends;
    } catch (err) {
      if (!isTableMissingError(err)) {
        console.warn('[CacheService] attachCachedAnalysisScores warning:', err);
      }
      return trends;
    }
  }

  // --- AI USAGE TRACKING ---
  static async recordAiUsage(operation: 'analysis' | 'content_generation' | 'kdp' | 'keywords', keyword: string, tokens: number = 800): Promise<void> {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (memoryCache.aiUsageToday.date !== todayStr) {
      memoryCache.aiUsageToday = {
        analyses: 0,
        contentGenerations: 0,
        tokens: 0,
        date: todayStr,
      };
    }

    if (operation === 'analysis') {
      memoryCache.aiUsageToday.analyses += 1;
    } else {
      memoryCache.aiUsageToday.contentGenerations += 1;
    }
    memoryCache.aiUsageToday.tokens += tokens;

    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing('ai_usage')) {
      try {
        const { error } = await supabase.from('ai_usage').insert({
          operation,
          keyword,
          tokens_used: tokens,
          created_at: new Date().toISOString(),
        });
        if (error && isTableMissingError(error)) {
          recordTableMissing('ai_usage');
        }
      } catch (err: any) {
        if (!isTableMissingError(err)) {
          console.warn('Supabase recordAiUsage error:', err?.message || err);
        }
      }
    }
  }

  static async getAiUsageStats(): Promise<AiUsageStats> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfToday = `${todayStr}T00:00:00.000Z`;

    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing('ai_usage')) {
      try {
        const { data, error } = await supabase
          .from('ai_usage')
          .select('operation, tokens_used')
          .gte('created_at', startOfToday);

        if (error) {
          if (isTableMissingError(error)) {
            recordTableMissing('ai_usage');
          }
        } else if (data) {
          let analyses = 0;
          let contentGenerations = 0;
          let tokens = 0;

          for (const item of data) {
            if (item.operation === 'analysis') {
              analyses += 1;
            } else {
              contentGenerations += 1;
            }
            tokens += (item.tokens_used || 0);
          }

          return {
            todayAnalyses: analyses,
            todayContentGenerations: contentGenerations,
            totalTokens: tokens,
            lastUpdated: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        if (!isTableMissingError(err)) {
          console.warn('Supabase getAiUsageStats error:', err?.message || err);
        }
      }
    }

    return {
      todayAnalyses: memoryCache.aiUsageToday.analyses,
      todayContentGenerations: memoryCache.aiUsageToday.contentGenerations,
      totalTokens: memoryCache.aiUsageToday.tokens,
      lastUpdated: new Date().toISOString(),
    };
  }

  // --- DATABASE & SCHEMA READINESS CHECK ---
  static async getDatabaseStatus(): Promise<{
    configured: boolean;
    connected: boolean;
    schemaReady: boolean;
    missingTables: string[];
    usingMemoryFallback: boolean;
  }> {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return {
        configured: false,
        connected: false,
        schemaReady: false,
        missingTables: [],
        usingMemoryFallback: true,
      };
    }

    const checkTables = ['trends', 'trend_analysis', 'saved_trends', 'ai_usage'];
    const missing: string[] = [];

    for (const tableName of checkTables) {
      if (isTableMissing(tableName)) {
        missing.push(tableName);
        continue;
      }
      try {
        const { error } = await supabase.from(tableName).select('id').limit(1);
        if (error && isTableMissingError(error)) {
          recordTableMissing(tableName);
          missing.push(tableName);
        }
      } catch {
        recordTableMissing(tableName);
        missing.push(tableName);
      }
    }

    return {
      configured: true,
      connected: true,
      schemaReady: missing.length === 0,
      missingTables: missing,
      usingMemoryFallback: missing.length > 0,
    };
  }
}
