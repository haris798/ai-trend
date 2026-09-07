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

  // 4. Gemini Trend Analysis (/api/analyze with 24-hour Supabase caching)
  app.post('/api/analyze', async (req, res) => {
    const { keyword, region, category, trendData, forceRefresh } = req.body;

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

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Source', 'gemini_api');

      return res.json({
        success: true,
        cached: false,
        source: 'gemini_3.8_flash',
        ttlRemainingMs: 24 * 60 * 60 * 1000,
        cachedAt: analysis.created_at || new Date().toISOString(),
        data: analysis,
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
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const keywords = await GeminiTrendService.expandKeywords(keyword, region || 'ID');
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
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const ideas = await GeminiTrendService.generateContentIdeas(keyword, region || 'ID', analysis);
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
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const kdp = await GeminiTrendService.analyzeKdp(keyword, region || 'ID');
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
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    try {
      const monetization = await GeminiTrendService.analyzeMonetization(keyword, region || 'ID', category || 'General');
      await CacheService.recordAiUsage('analysis', keyword, 650);
      return res.json({ success: true, data: monetization });
    } catch (error: any) {
      console.error('Gemini monetization error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. AI Usage Stats (/api/ai-usage)
  app.get('/api/ai-usage', async (req, res) => {
    try {
      const stats = await CacheService.getAiUsageStats();
      return res.json({ success: true, data: stats });
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
