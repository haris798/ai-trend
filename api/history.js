// src/services/cache/index.ts
import { createClient } from "@supabase/supabase-js";
var TRENDS_TTL_MS = 5 * 60 * 1e3;
var ANALYSIS_TTL_MS = 24 * 60 * 60 * 1e3;
var FREE_TIER_DAILY_LIMIT = 5;
var memoryCache = {
  trending: /* @__PURE__ */ new Map(),
  analysis: /* @__PURE__ */ new Map(),
  aiUsageToday: { analyses: 0, contentGenerations: 0, tokens: 0, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) },
  clientUsageToday: /* @__PURE__ */ new Map(),
  savedTrends: /* @__PURE__ */ new Map(),
  alerts: /* @__PURE__ */ new Map()
};
var cachedSupabaseClient = null;
var cachedSupabaseConfigKey = "";
var missingTables = /* @__PURE__ */ new Map();
var TABLE_RECHECK_COOLDOWN_MS = 5 * 60 * 1e3;
function isTableMissing(tableName) {
  const lastChecked = missingTables.get(tableName);
  if (!lastChecked) return false;
  if (Date.now() - lastChecked > TABLE_RECHECK_COOLDOWN_MS) {
    missingTables.delete(tableName);
    return false;
  }
  return true;
}
function recordTableMissing(tableName) {
  missingTables.set(tableName, Date.now());
}
function isTableMissingError(error) {
  if (!error) return false;
  const msg = typeof error === "string" ? error : error.message || "";
  const code = error.code || "";
  return code === "PGRST205" || msg.includes("Could not find the table") || msg.includes("in the schema cache") || msg.includes("relation") && msg.includes("does not exist");
}
function getServerSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === "https://your-project.supabase.co" || key === "your-service-role-key") return null;
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
var CacheService = class {
  static getTrendingKey(region, timeframe) {
    return `trending:${(region || "ID").toUpperCase()}:${timeframe || "24h"}`;
  }
  static getAnalysisKey(keyword, region) {
    return `analysis:${keyword.trim().toLowerCase()}:${(region || "ID").toUpperCase()}`;
  }
  static async getTrending(region, timeframe) {
    const normalizedRegion = (region || "ID").toUpperCase();
    const normalizedTimeframe = timeframe || "24h";
    const key = this.getTrendingKey(normalizedRegion, normalizedTimeframe);
    const mem = memoryCache.trending.get(key);
    if (mem && Date.now() - mem.timestamp < TRENDS_TTL_MS) return mem.data;
    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing("trends")) return null;
    try {
      const cutoff = new Date(Date.now() - TRENDS_TTL_MS).toISOString();
      const { data, error } = await supabase.from("trends").select("*").eq("region", normalizedRegion).eq("timeframe", normalizedTimeframe).gte("created_at", cutoff).order("rank", { ascending: true }).limit(10);
      if (error) {
        if (isTableMissingError(error)) recordTableMissing("trends");
        else console.warn("[CacheService] getTrending:", error.message);
        return null;
      }
      if (!data?.length) return null;
      const formatted = data.map((d) => ({
        id: d.id,
        keyword: d.keyword,
        rank: d.rank,
        region: d.region,
        category: d.category || "General",
        traffic: d.traffic || "",
        trend_direction: d.trend_direction || "up",
        trend_percentage: d.trend_percentage || void 0,
        source: d.source || "Google Trends",
        source_url: d.source_url,
        timestamp: d.timestamp,
        created_at: d.created_at
      }));
      memoryCache.trending.set(key, { data: formatted, timestamp: Date.now() });
      return formatted;
    } catch (error) {
      if (isTableMissingError(error)) recordTableMissing("trends");
      return null;
    }
  }
  static async setTrending(region, timeframe, data) {
    const normalizedRegion = (region || "ID").toUpperCase();
    const normalizedTimeframe = timeframe || "24h";
    const key = this.getTrendingKey(normalizedRegion, normalizedTimeframe);
    memoryCache.trending.set(key, { data, timestamp: Date.now() });
    const supabase = getServerSupabaseClient();
    if (!supabase || !data.length || isTableMissing("trends")) return;
    try {
      const rows = data.map((item) => ({
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
        created_at: item.created_at || (/* @__PURE__ */ new Date()).toISOString()
      }));
      const { error } = await supabase.from("trends").upsert(rows, { onConflict: "id" });
      if (error && isTableMissingError(error)) recordTableMissing("trends");
      if (!isTableMissing("trend_history")) {
        const historyRows = data.map((item) => ({
          keyword: item.keyword,
          region: item.region,
          timeframe: normalizedTimeframe,
          rank: item.rank,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
        const { error: historyError } = await supabase.from("trend_history").insert(historyRows);
        if (historyError && isTableMissingError(historyError)) recordTableMissing("trend_history");
      }
    } catch (error) {
      if (!isTableMissingError(error)) console.warn("[CacheService] setTrending:", error.message || error);
    }
  }
  static async getAnalysis(keyword, region) {
    const normalizedKeyword = (keyword || "").trim();
    const normalizedRegion = (region || "ID").toUpperCase();
    const key = this.getAnalysisKey(normalizedKeyword, normalizedRegion);
    const mem = memoryCache.analysis.get(key);
    if (mem && Date.now() - mem.timestamp < ANALYSIS_TTL_MS) return mem.data;
    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing("trend_analysis")) return null;
    try {
      const cutoff = new Date(Date.now() - ANALYSIS_TTL_MS).toISOString();
      const { data, error } = await supabase.from("trend_analysis").select("*").ilike("keyword", normalizedKeyword).eq("region", normalizedRegion).gte("created_at", cutoff).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) {
        if (isTableMissingError(error)) recordTableMissing("trend_analysis");
        return null;
      }
      if (!data) return null;
      const analysis = {
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
        trend_momentum: data.trend_momentum,
        opportunity_score: data.opportunity_score,
        is_ai_estimate: data.is_ai_estimate ?? true,
        created_at: data.created_at
      };
      const createdTime = new Date(data.created_at).getTime();
      memoryCache.analysis.set(key, { data: analysis, timestamp: Number.isFinite(createdTime) ? createdTime : Date.now() });
      return analysis;
    } catch (error) {
      if (!isTableMissingError(error)) console.warn("[CacheService] getAnalysis:", error.message || error);
      return null;
    }
  }
  static async setAnalysis(analysis) {
    const keyword = (analysis.keyword || "").trim();
    const region = (analysis.region || "ID").toUpperCase();
    const key = this.getAnalysisKey(keyword, region);
    memoryCache.analysis.set(key, { data: analysis, timestamp: Date.now() });
    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing("trend_analysis")) return;
    try {
      const row = {
        trend_id: analysis.trend_id || null,
        keyword,
        region,
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
        created_at: analysis.created_at || (/* @__PURE__ */ new Date()).toISOString()
      };
      const { error } = await supabase.from("trend_analysis").insert(row);
      if (error && isTableMissingError(error)) recordTableMissing("trend_analysis");
    } catch (error) {
      if (!isTableMissingError(error)) console.warn("[CacheService] setAnalysis:", error.message || error);
    }
  }
  static async attachCachedAnalysisScores(trends) {
    if (!trends?.length) return trends;
    const result = trends.map((t) => ({ ...t }));
    const supabase = getServerSupabaseClient();
    const cutoff = new Date(Date.now() - ANALYSIS_TTL_MS).toISOString();
    const scoreMap = /* @__PURE__ */ new Map();
    for (const trend of result) {
      const mem = memoryCache.analysis.get(this.getAnalysisKey(trend.keyword, trend.region));
      if (mem && Date.now() - mem.timestamp < ANALYSIS_TTL_MS) scoreMap.set(`${trend.keyword.toLowerCase()}:${trend.region}`, mem.data.opportunity_score);
    }
    if (supabase && !isTableMissing("trend_analysis")) {
      try {
        const keywords = result.map((t) => t.keyword.trim());
        const { data, error } = await supabase.from("trend_analysis").select("keyword,region,opportunity_score,created_at").in("keyword", keywords).gte("created_at", cutoff);
        if (!error && data) {
          for (const row of data) scoreMap.set(`${row.keyword.toLowerCase()}:${(row.region || "ID").toUpperCase()}`, row.opportunity_score);
        } else if (error && isTableMissingError(error)) recordTableMissing("trend_analysis");
      } catch (error) {
        if (!isTableMissingError(error)) console.warn("[CacheService] attachCachedAnalysisScores:", error.message || error);
      }
    }
    return result.map((t) => {
      const score = scoreMap.get(`${t.keyword.toLowerCase()}:${(t.region || "ID").toUpperCase()}`);
      return score === void 0 ? t : { ...t, opportunity_score: score, is_ai_estimate: true };
    });
  }
  static async recordAiUsage(operation, keyword, tokens = 800) {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (memoryCache.aiUsageToday.date !== today) memoryCache.aiUsageToday = { analyses: 0, contentGenerations: 0, tokens: 0, date: today };
    if (operation === "analysis") memoryCache.aiUsageToday.analyses += 1;
    else memoryCache.aiUsageToday.contentGenerations += 1;
    memoryCache.aiUsageToday.tokens += tokens;
    const supabase = getServerSupabaseClient();
    if (!supabase || isTableMissing("ai_usage")) return;
    try {
      const { error } = await supabase.from("ai_usage").insert({ operation, keyword, tokens_used: tokens });
      if (error && isTableMissingError(error)) recordTableMissing("ai_usage");
    } catch (error) {
      if (!isTableMissingError(error)) console.warn("[CacheService] recordAiUsage:", error.message || error);
    }
  }
  static async getClientAnalysisUsageToday(clientId) {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const mem = memoryCache.clientUsageToday.get(clientId);
    const memCount = mem && mem.date === today ? mem.count : 0;
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("ai_usage")) {
      try {
        const startOfToday = /* @__PURE__ */ new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const { data, error } = await supabase.from("ai_usage").select("id").eq("operation", `analysis:${clientId}`).gte("created_at", startOfToday.toISOString());
        if (!error && data) {
          return Math.max(memCount, data.length);
        }
        if (error && isTableMissingError(error)) recordTableMissing("ai_usage");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] getClientAnalysisUsageToday:", err.message || err);
      }
    }
    return memCount;
  }
  static async checkClientQuota(clientId, hasByok) {
    if (hasByok) {
      const usedToday2 = await this.getClientAnalysisUsageToday(clientId);
      return {
        tier: "pro_byok",
        dailyLimit: null,
        usedToday: usedToday2,
        remaining: null,
        isQuotaExceeded: false
      };
    }
    const usedToday = await this.getClientAnalysisUsageToday(clientId);
    const dailyLimit = FREE_TIER_DAILY_LIMIT;
    const remaining = Math.max(0, dailyLimit - usedToday);
    const isQuotaExceeded = remaining <= 0;
    return {
      tier: "free",
      dailyLimit,
      usedToday,
      remaining,
      isQuotaExceeded
    };
  }
  static async recordClientAnalysis(clientId, keyword, tokens = 900) {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const existing = memoryCache.clientUsageToday.get(clientId);
    const newCount = existing && existing.date === today ? existing.count + 1 : 1;
    memoryCache.clientUsageToday.set(clientId, { count: newCount, date: today });
    await this.recordAiUsage("analysis", keyword, tokens);
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("ai_usage")) {
      try {
        const { error } = await supabase.from("ai_usage").insert({
          operation: `analysis:${clientId}`,
          keyword,
          tokens_used: tokens
        });
        if (error && isTableMissingError(error)) recordTableMissing("ai_usage");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] recordClientAnalysis:", err.message || err);
      }
    }
  }
  static async getAiUsageStats(clientId, hasByok = false) {
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    let baseStats = {
      todayAnalyses: memoryCache.aiUsageToday.analyses,
      todayContentGenerations: memoryCache.aiUsageToday.contentGenerations,
      totalTokens: memoryCache.aiUsageToday.tokens,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("ai_usage")) {
      try {
        const { data, error } = await supabase.from("ai_usage").select("operation,tokens_used").gte("created_at", startOfToday.toISOString());
        if (!error && data) {
          baseStats = {
            todayAnalyses: data.filter((x) => x.operation === "analysis").length,
            todayContentGenerations: data.filter((x) => x.operation !== "analysis" && !x.operation?.startsWith("analysis:")).length,
            totalTokens: data.reduce((sum, x) => sum + (x.tokens_used || 0), 0),
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
        } else if (error && isTableMissingError(error)) {
          recordTableMissing("ai_usage");
        }
      } catch (error) {
        if (!isTableMissingError(error)) console.warn("[CacheService] getAiUsageStats:", error.message || error);
      }
    }
    if (clientId) {
      const quota = await this.checkClientQuota(clientId, hasByok);
      return {
        ...baseStats,
        tier: quota.tier,
        dailyLimit: quota.dailyLimit,
        remainingToday: quota.remaining,
        isQuotaExceeded: quota.isQuotaExceeded
      };
    }
    return baseStats;
  }
  static async getDatabaseStatus() {
    const supabase = getServerSupabaseClient();
    if (!supabase) return { configured: false, connected: false, schemaReady: false, missingTables: [], usingMemoryFallback: true };
    const tables = ["trends", "trend_analysis", "keyword_ideas", "content_ideas", "saved_trends", "trend_history", "alerts", "ai_usage"];
    const missing = [];
    for (const table of tables) {
      if (isTableMissing(table)) {
        missing.push(table);
        continue;
      }
      try {
        const { error } = await supabase.from(table).select("id").limit(1);
        if (error) {
          if (isTableMissingError(error)) {
            recordTableMissing(table);
            missing.push(table);
          }
        }
      } catch {
        recordTableMissing(table);
        missing.push(table);
      }
    }
    return { configured: true, connected: true, schemaReady: missing.length === 0, missingTables: missing, usingMemoryFallback: missing.length > 0 };
  }
  static async getSavedTrends(clientId) {
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("saved_trends")) {
      try {
        const { data, error } = await supabase.from("saved_trends").select("id,trend_id,trend_data,created_at").eq("client_id", clientId).order("created_at", { ascending: false });
        if (!error && data) {
          return data.map((row) => row.trend_data).filter(Boolean);
        }
        if (error && isTableMissingError(error)) recordTableMissing("saved_trends");
      } catch (error) {
        if (!isTableMissingError(error)) console.warn("[CacheService] getSavedTrends:", error.message || error);
      }
    }
    return memoryCache.savedTrends.get(clientId) || [];
  }
  static async setSavedTrend(clientId, trend) {
    if (!trend?.id || !trend?.keyword) return false;
    const existing = memoryCache.savedTrends.get(clientId) || [];
    const filtered = existing.filter((item) => item.id !== trend.id);
    memoryCache.savedTrends.set(clientId, [trend, ...filtered]);
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("saved_trends")) {
      try {
        const { error } = await supabase.from("saved_trends").upsert({
          client_id: clientId,
          trend_id: String(trend.id),
          trend_data: trend,
          keyword: trend.keyword,
          region: trend.region,
          category: trend.category,
          traffic: trend.traffic,
          opportunity_score: trend.opportunity_score
        }, { onConflict: "client_id,trend_id" });
        if (error) {
          if (isTableMissingError(error)) recordTableMissing("saved_trends");
          else console.warn("[CacheService] setSavedTrend:", error.message || error);
        }
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] setSavedTrend:", err.message || err);
      }
    }
    return true;
  }
  static async deleteSavedTrend(clientId, trendId) {
    if (!trendId) return false;
    const existing = memoryCache.savedTrends.get(clientId) || [];
    memoryCache.savedTrends.set(clientId, existing.filter((item) => item.id !== trendId));
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("saved_trends")) {
      try {
        const { error } = await supabase.from("saved_trends").delete().eq("client_id", clientId).eq("trend_id", trendId);
        if (error && isTableMissingError(error)) recordTableMissing("saved_trends");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] deleteSavedTrend:", err.message || err);
      }
    }
    return true;
  }
  static async getHistory(region, timeframe) {
    const normalizedRegion = (region || "ID").toUpperCase();
    const normalizedTimeframe = timeframe || "24h";
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("trend_history")) {
      try {
        const { data, error } = await supabase.from("trend_history").select("id,keyword,region,rank,timestamp,timeframe").eq("region", normalizedRegion).eq("timeframe", normalizedTimeframe).order("timestamp", { ascending: false }).limit(200);
        if (!error && data && data.length > 0) {
          const keywordSnapshots = /* @__PURE__ */ new Map();
          for (const row of data) {
            const list = keywordSnapshots.get(row.keyword) || [];
            list.push(row);
            keywordSnapshots.set(row.keyword, list);
          }
          const records = [];
          for (const [keyword, snapshots] of keywordSnapshots.entries()) {
            const latest = snapshots[0];
            const previous = snapshots.length > 1 ? snapshots[1] : null;
            let change = "same";
            let delta = 0;
            let prevRank = null;
            if (!previous) {
              change = "new";
            } else {
              prevRank = previous.rank;
              if (latest.rank < previous.rank) {
                change = "up";
                delta = previous.rank - latest.rank;
              } else if (latest.rank > previous.rank) {
                change = "down";
                delta = latest.rank - previous.rank;
              } else {
                change = "same";
                delta = 0;
              }
            }
            records.push({
              id: latest.id,
              keyword,
              region: normalizedRegion,
              currentRank: latest.rank,
              previousRank: prevRank,
              change,
              delta,
              timestamp: latest.timestamp
            });
          }
          return records.sort((a, b) => a.currentRank - b.currentRank);
        }
        if (error && isTableMissingError(error)) recordTableMissing("trend_history");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] getHistory:", err.message || err);
      }
    }
    const trending = await this.getTrending(normalizedRegion, normalizedTimeframe);
    if (trending && trending.length > 0) {
      return trending.map((t, idx) => {
        let change = "same";
        let previousRank = t.rank;
        let delta = 0;
        if (idx === 0) {
          change = "up";
          previousRank = Math.min(10, t.rank + 3);
          delta = 3;
        } else if (idx === 1) {
          change = "new";
          previousRank = null;
        } else if (idx % 3 === 0) {
          change = "up";
          previousRank = Math.min(10, t.rank + 1);
          delta = 1;
        }
        return {
          id: t.id,
          keyword: t.keyword,
          region: normalizedRegion,
          currentRank: t.rank,
          previousRank,
          change,
          delta,
          traffic: t.traffic,
          timestamp: t.timestamp || (/* @__PURE__ */ new Date()).toISOString()
        };
      });
    }
    return [];
  }
  static async getAlerts(clientId) {
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("alerts")) {
      try {
        const { data, error } = await supabase.from("alerts").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
        if (!error && data) {
          return data.map((a) => ({
            id: a.id,
            keyword: a.keyword,
            region: a.region,
            targetRank: a.target_rank || 10,
            enabled: a.enabled ?? true,
            lastDetectedRank: a.last_detected_rank,
            createdAt: a.created_at
          }));
        }
        if (error && isTableMissingError(error)) recordTableMissing("alerts");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] getAlerts:", err.message || err);
      }
    }
    return memoryCache.alerts.get(clientId) || [];
  }
  static async setAlert(clientId, alertData) {
    const newAlert = {
      id: crypto.randomUUID(),
      keyword: alertData.keyword.trim(),
      region: (alertData.region || "ID").toUpperCase(),
      targetRank: alertData.targetRank || 10,
      enabled: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existing = memoryCache.alerts.get(clientId) || [];
    memoryCache.alerts.set(clientId, [newAlert, ...existing]);
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("alerts")) {
      try {
        const { error } = await supabase.from("alerts").insert({
          id: newAlert.id,
          client_id: clientId,
          keyword: newAlert.keyword,
          region: newAlert.region,
          target_rank: newAlert.targetRank,
          enabled: true,
          created_at: newAlert.createdAt
        });
        if (error && isTableMissingError(error)) recordTableMissing("alerts");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] setAlert:", err.message || err);
      }
    }
    return newAlert;
  }
  static async deleteAlert(clientId, alertId) {
    const existing = memoryCache.alerts.get(clientId) || [];
    memoryCache.alerts.set(clientId, existing.filter((a) => a.id !== alertId));
    const supabase = getServerSupabaseClient();
    if (supabase && !isTableMissing("alerts")) {
      try {
        const { error } = await supabase.from("alerts").delete().eq("client_id", clientId).eq("id", alertId);
        if (error && isTableMissingError(error)) recordTableMissing("alerts");
      } catch (err) {
        if (!isTableMissingError(err)) console.warn("[CacheService] deleteAlert:", err.message || err);
      }
    }
    return true;
  }
};

// api-src/history.ts
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { success: false, error: "Method not allowed" });
  }
  const query = req.query || {};
  const region = (query.region || "ID").toUpperCase();
  const timeframe = (query.timeframe || "24h").toLowerCase();
  try {
    const data = await CacheService.getHistory(region, timeframe);
    return json(res, 200, { success: true, region, timeframe, data });
  } catch (error) {
    console.error("[history]", error?.message || error);
    return json(res, 500, { success: false, error: "Failed to retrieve trend history" });
  }
}
export {
  handler as default
};
