import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, region, category, trendData, forceRefresh } = req.body || {};
  const clientId = String(req.headers['x-client-id'] || req.body?.clientId || 'default-client').trim();
  const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
  const hasByok = Boolean(customApiKey && customApiKey.length > 10);

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required for analysis.' });
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

        res.setHeader?.('X-Cache', 'HIT');
        res.setHeader?.('X-Cache-Source', 'supabase_24h');
        res.setHeader?.('X-Cache-TTL-Remaining', `${Math.round(ttlRemainingMs / 1000)}s`);

        return res.status(200).json({
          success: true,
          cached: true,
          source: 'supabase_cache',
          ttlRemainingMs,
          cachedAt: cached.created_at || new Date().toISOString(),
          data: cached,
        });
      }
    }

    // 2. Check Quota before executing live AI generation
    const quota = await CacheService.checkClientQuota(clientId, hasByok);
    if (quota.isQuotaExceeded) {
      return res.status(429).json({
        success: false,
        error: 'Batas kuota harian Free Tier tercapai (5/5 analisis hari ini). Masukkan Gemini API Key pribadi Anda di menu Settings (BYOK) untuk akses tanpa batas, atau tunggu reset kuota besok.',
        quotaExceeded: true,
        tier: 'free',
        dailyLimit: quota.dailyLimit,
        usedToday: quota.usedToday,
        remaining: quota.remaining,
      });
    }

    // 3. Cache miss or forced refresh: Execute Gemini Analysis
    const analysis = await GeminiTrendService.analyzeTrend(
      keyword,
      reg,
      category || 'General',
      trendData || {},
      customApiKey
    );

    // 4. Save to Supabase 24h Cache & Track Usage
    await CacheService.setAnalysis(analysis);
    await CacheService.recordClientAnalysis(clientId, keyword, 900);

    res.setHeader?.('X-Cache', 'MISS');
    res.setHeader?.('X-Cache-Source', hasByok ? 'gemini_byok' : 'gemini_3.8_flash');

    return res.status(200).json({
      success: true,
      cached: false,
      source: hasByok ? 'gemini_byok' : 'gemini_3.8_flash',
      ttlRemainingMs: 24 * 60 * 60 * 1000,
      cachedAt: analysis.created_at || new Date().toISOString(),
      data: analysis,
      tier: quota.tier,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete Gemini AI trend analysis.',
    });
  }
}
