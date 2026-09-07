import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, region, category, trendData, forceRefresh } = req.body || {};

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

    // 2. Cache miss or forced refresh: Execute Gemini Analysis
    const analysis = await GeminiTrendService.analyzeTrend(
      keyword,
      reg,
      category || 'General',
      trendData || {}
    );

    // 3. Save to Supabase 24h Cache & Track Usage
    await CacheService.setAnalysis(analysis);
    await CacheService.recordAiUsage('analysis', keyword, 900);

    res.setHeader?.('X-Cache', 'MISS');
    res.setHeader?.('X-Cache-Source', 'gemini_api');

    return res.status(200).json({
      success: true,
      cached: false,
      source: 'gemini_3.8_flash',
      ttlRemainingMs: 24 * 60 * 60 * 1000,
      cachedAt: analysis.created_at || new Date().toISOString(),
      data: analysis,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete Gemini AI trend analysis.',
    });
  }
}
