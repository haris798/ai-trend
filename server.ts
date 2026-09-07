import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getTrendingProvider, GoogleTrendsProvider } from './src/services/trending';
import { CacheService } from './src/services/cache';
import { GeminiTrendService } from './src/services/gemini';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      developmentMode: process.env.DEVELOPMENT_MODE === 'true',
    });
  });

  // Database & Cache status check
  app.get('/api/db-status', async (req, res) => {
    try {
      const status = await CacheService.getDatabaseStatus();
      res.json({
        success: true,
        ...status,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Migration SQL download / preview endpoint
  app.get('/api/migration-sql', (req, res) => {
    try {
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260907_initial_schema.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        return res.json({ success: true, sql });
      }
      return res.status(404).json({ success: false, error: 'Migration file not found.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Provider Documentation & Status
  app.get('/api/provider-status', (req, res) => {
    const provider = getTrendingProvider();
    res.json({
      success: true,
      activeProvider: provider.name,
      isConfigured: provider.isConfigured(),
      developmentMode: process.env.DEVELOPMENT_MODE === 'true',
      documentation: GoogleTrendsProvider.documentation,
    });
  });

  // 3. Trending Searches Endpoint (/api/trending?region=ID&timeframe=24h&limit=10)
  app.get('/api/trending', async (req, res) => {
    const region = ((req.query.region as string) || 'ID').toUpperCase();
    const timeframe = (req.query.timeframe as string) || '24h';
    const forceRefresh = req.query.refresh === 'true';

    try {
      // Check Cache first if not force refresh
      if (!forceRefresh) {
        const cachedData = await CacheService.getTrending(region, timeframe);
        if (cachedData && cachedData.length > 0) {
          const enrichedCached = await CacheService.attachCachedAnalysisScores(cachedData);
          return res.json({
            success: true,
            region,
            timeframe,
            source: enrichedCached[0]?.source || 'Cache (Supabase / In-Memory)',
            updatedAt: enrichedCached[0]?.timestamp || new Date().toISOString(),
            cached: true,
            data: enrichedCached,
          });
        }
      }

      // Fetch from Provider
      const provider = getTrendingProvider();
      const freshData = await provider.getTrendingSearches(region, timeframe);

      // Enrich with any existing cached analysis scores from Supabase
      const enrichedData = await CacheService.attachCachedAnalysisScores(freshData);

      // Save to Supabase / memory cache
      await CacheService.setTrending(region, timeframe, enrichedData);

      return res.json({
        success: true,
        region,
        timeframe,
        source: provider.name,
        updatedAt: new Date().toISOString(),
        cached: false,
        data: enrichedData,
      });
    } catch (error: any) {
      console.error('Error fetching trending data:', error.message);
      
      // Attempt to return stale cache on provider failure
      const staleData = await CacheService.getTrending(region, timeframe);
      if (staleData && staleData.length > 0) {
        return res.json({
          success: true,
          region,
          timeframe,
          source: 'Stale Cache (Provider Error Fallback)',
          updatedAt: staleData[0]?.timestamp || new Date().toISOString(),
          cached: true,
          data: staleData,
          warning: error.message,
        });
      }

      return res.status(503).json({
        success: false,
        region,
        timeframe,
        source: 'Error',
        updatedAt: new Date().toISOString(),
        data: [],
        error: error.message || 'Live trending provider is not configured or rate-limited.',
      });
    }
  });

  // 4. Gemini Trend Analysis (/api/analyze with 24-hour Supabase caching & Quota)
  app.post('/api/analyze', async (req, res) => {
    const { keyword, region, category, trendData, forceRefresh } = req.body;
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

          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Source', 'supabase_24h');
          res.setHeader('X-Cache-TTL-Remaining', `${Math.round(ttlRemainingMs / 1000)}s`);

          return res.json({
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

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Source', hasByok ? 'gemini_byok' : 'gemini_3.8_flash');

      return res.json({
        success: true,
        cached: false,
        source: hasByok ? 'gemini_byok' : 'gemini_3.8_flash',
        ttlRemainingMs: 24 * 60 * 60 * 1000,
        cachedAt: analysis.created_at || new Date().toISOString(),
        data: analysis,
        tier: quota.tier,
      });
    } catch (error: any) {
      console.error('Gemini analyze error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete Gemini AI trend analysis.',
      });
    }
  });

  // 5. Keyword Expansion (/api/expand-keywords)
  app.post('/api/expand-keywords', async (req, res) => {
    const { keyword, region } = req.body;
    const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const keywords = await GeminiTrendService.expandKeywords(keyword, region || 'ID', customApiKey);
      await CacheService.recordAiUsage('keywords', keyword, 750);
      return res.json({ success: true, data: keywords });
    } catch (error: any) {
      console.error('Gemini expand keywords error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. Content Ideas Generator (/api/generate-content)
  app.post('/api/generate-content', async (req, res) => {
    const { keyword, region, analysis } = req.body;
    const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const ideas = await GeminiTrendService.generateContentIdeas(keyword, region || 'ID', analysis, customApiKey);
      await CacheService.recordAiUsage('content_generation', keyword, 1200);
      return res.json({ success: true, data: ideas });
    } catch (error: any) {
      console.error('Gemini content ideas error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. KDP Analysis (/api/generate-kdp)
  app.post('/api/generate-kdp', async (req, res) => {
    const { keyword, region } = req.body;
    const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const kdp = await GeminiTrendService.analyzeKdp(keyword, region || 'ID', customApiKey);
      await CacheService.recordAiUsage('kdp', keyword, 1000);
      return res.json({ success: true, data: kdp });
    } catch (error: any) {
      console.error('Gemini KDP analysis error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Monetization Channel Analysis (/api/monetization)
  app.post('/api/monetization', async (req, res) => {
    const { keyword, region, category } = req.body;
    const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const monetization = await GeminiTrendService.analyzeMonetization(keyword, region || 'ID', category || 'General', customApiKey);
      await CacheService.recordAiUsage('analysis', keyword, 650);
      return res.json({ success: true, data: monetization });
    } catch (error: any) {
      console.error('Gemini monetization error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. AI Usage Stats (/api/ai-usage)
  app.get('/api/ai-usage', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.query.clientId || 'default-client').trim();
    const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
    const hasByok = Boolean(customApiKey && customApiKey.length > 10);
    try {
      const stats = await CacheService.getAiUsageStats(clientId, hasByok);
      return res.json({ success: true, data: stats });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 10. Saved Trends (/api/saved-trends)
  app.get('/api/saved-trends', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.query.clientId || 'default-client').trim();
    try {
      const data = await CacheService.getSavedTrends(clientId);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/saved-trends', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.body?.clientId || 'default-client').trim();
    const trend = req.body?.trend || req.body;
    if (!trend?.id || !trend?.keyword) {
      return res.status(400).json({ success: false, error: 'A valid trend is required.' });
    }
    try {
      await CacheService.setSavedTrend(clientId, trend);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/saved-trends', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.query.clientId || 'default-client').trim();
    const trendId = String(req.query.id || req.body?.id || '').trim();
    if (!trendId) {
      return res.status(400).json({ success: false, error: 'Trend ID is required.' });
    }
    try {
      await CacheService.deleteSavedTrend(clientId, trendId);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 11. Trend History (/api/history)
  app.get('/api/history', async (req, res) => {
    const region = ((req.query.region as string) || 'ID').toUpperCase();
    const timeframe = (req.query.timeframe as string) || '24h';
    try {
      const data = await CacheService.getHistory(region, timeframe);
      return res.json({ success: true, region, timeframe, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 12. Alerts (/api/alerts)
  app.get('/api/alerts', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.query.clientId || 'default-client').trim();
    try {
      const data = await CacheService.getAlerts(clientId);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/alerts', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.body?.clientId || 'default-client').trim();
    const { keyword, region, targetRank } = req.body || {};
    if (!keyword) {
      return res.status(400).json({ success: false, error: 'Keyword is required.' });
    }
    try {
      const alert = await CacheService.setAlert(clientId, { keyword, region, targetRank });
      return res.json({ success: true, data: alert });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/alerts', async (req, res) => {
    const clientId = String(req.headers['x-client-id'] || req.query.clientId || 'default-client').trim();
    const alertId = String(req.query.id || req.body?.id || '').trim();
    if (!alertId) {
      return res.status(400).json({ success: false, error: 'Alert ID is required.' });
    }
    try {
      await CacheService.deleteAlert(clientId, alertId);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
