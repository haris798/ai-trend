import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';
import { sendJson, parseBody, getClientId, getCustomApiKey } from './_utils';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const { keyword, region, category, trendData, forceRefresh } = body || {};
  const clientId = getClientId(req, body);
  const customApiKey = getCustomApiKey(req);
  const hasByok = Boolean(customApiKey && customApiKey.length > 10);

  if (!keyword) {
    return sendJson(res, 400, { error: 'Keyword is required for analysis.' });
  }

  const reg = (region || 'ID').toUpperCase();

  try {
    // 1. Check 24-hour cache (Supabase persistent tier + In-Memory tier)
    if (!forceRefresh) {
      const cached = await CacheService.getAnalysis(keyword, reg);
      if (cached) {
        const createdAt = cached.created_at ? new Date(cached.created_at).getTime() : Date.now();
        const ageMs = Math.max(0, Date.now() - createdAt);
        const ttlRemainingMs = Math.max(0, 24 * 60 * 60 * 1000 - ageMs);

        return sendJson(res, 200, {
          success: true,
          cached: true,
          source: 'supabase_cache',
          ttlRemainingMs,
          cachedAt: cached.created_at || new Date().toISOString(),
          data: cached,
        }, {
          'X-Cache': 'HIT',
          'X-Cache-Source': 'supabase_24h',
          'X-Cache-TTL-Remaining': `${Math.round(ttlRemainingMs / 1000)}s`
        });
      }
    }

    // 2. Check Quota before executing live AI generation
    const quota = await CacheService.checkClientQuota(clientId, hasByok);
    if (quota.isQuotaExceeded) {
      return sendJson(res, 429, {
        success: false,
        quotaExceeded: true,
        tier: quota.tier,
        dailyLimit: quota.dailyLimit,
        usedToday: quota.usedToday,
        remainingToday: quota.remaining,
        error: `Batas kuota harian analisis AI gratis telah tercapai (${quota.usedToday}/${quota.dailyLimit} analisis hari ini). Silakan gunakan Gemini API Key Anda sendiri (BYOK) di Pengaturan atau tunggu besok.`,
      });
    }

    // 3. Generate live trend intelligence
    const analysis = await GeminiTrendService.analyzeTrend(
      keyword,
      reg,
      category,
      trendData,
      customApiKey || undefined
    );

    // 4. Save to Supabase and memory cache
    await CacheService.setAnalysis(analysis);
    if (!hasByok) {
      await CacheService.recordClientAnalysis(clientId, keyword, 1500);
    } else {
      await CacheService.recordAiUsage('analysis', keyword, 1500);
    }

    return sendJson(res, 200, {
      success: true,
      cached: false,
      source: hasByok ? 'gemini_byok' : 'gemini_live',
      ttlRemainingMs: 24 * 60 * 60 * 1000,
      cachedAt: new Date().toISOString(),
      data: analysis,
    }, {
      'X-Cache': 'MISS'
    });
  } catch (error: any) {
    console.error('Error generating trend analysis:', error);
    return sendJson(res, 500, {
      success: false,
      error: error.message || 'Failed to analyze trend with Gemini AI',
    });
  }
}
