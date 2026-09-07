import { getTrendingProvider } from '../src/services/trending';
import { CacheService } from '../src/services/cache';
import { sendJson, parseQuery } from './_utils';
import { TrendingSearch } from '../src/types';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const query = parseQuery(req);
  const region = (query.region || 'ID').toUpperCase();
  const timeframe = query.timeframe || '24h';
  const forceRefresh = query.refresh === 'true';

  try {
    // 1. Check cache first if not forcing a refresh
    if (!forceRefresh) {
      try {
        const cachedData = await CacheService.getTrending(region, timeframe);
        if (cachedData && cachedData.length > 0) {
          const enrichedCached = await CacheService.attachCachedAnalysisScores(cachedData);
          return sendJson(res, 200, {
            success: true,
            region,
            timeframe,
            source: enrichedCached[0]?.source || 'Cache (Supabase / In-Memory)',
            updatedAt: enrichedCached[0]?.timestamp || new Date().toISOString(),
            cached: true,
            data: enrichedCached,
          });
        }
      } catch (cacheErr) {
        console.warn('[trending] Cache lookup error:', cacheErr);
      }
    }

    // 2. Fetch fresh trends from provider
    try {
      const provider = getTrendingProvider();
      const freshData = await provider.getTrendingSearches(region, timeframe);
      const enrichedData = await CacheService.attachCachedAnalysisScores(freshData);
      await CacheService.setTrending(region, timeframe, enrichedData);

      return sendJson(res, 200, {
        success: true,
        region,
        timeframe,
        source: provider.name,
        updatedAt: new Date().toISOString(),
        cached: false,
        data: enrichedData,
      });
    } catch (providerError: any) {
      console.warn('[trending] Live provider error:', providerError.message);

      // Attempt fallback: stale cache
      try {
        const staleData = await CacheService.getTrending(region, timeframe);
        if (staleData && staleData.length > 0) {
          return sendJson(res, 200, {
            success: true,
            region,
            timeframe,
            source: 'Stale Cache (Provider Error Fallback)',
            updatedAt: staleData[0]?.timestamp || new Date().toISOString(),
            cached: true,
            data: staleData,
            warning: providerError.message,
          });
        }
      } catch {
        // Ignore stale cache error
      }

      // If live Google Trends is blocked or rate-limited on server datacenter IP,
      // return curated fallback topics so the dashboard NEVER crashes or renders blank
      const fallbackTrends: TrendingSearch[] = getFallbackTrends(region);
      return sendJson(res, 200, {
        success: true,
        region,
        timeframe,
        source: 'Curated Fallback Trends',
        updatedAt: new Date().toISOString(),
        cached: false,
        data: fallbackTrends,
        warning: `Google Trends RSS rate-limited or unavailable: ${providerError.message}. Showing top curated trends.`,
      });
    }
  } catch (fatalError: any) {
    console.error('[trending] Fatal handler error:', fatalError);
    return sendJson(res, 200, {
      success: true,
      region,
      timeframe,
      source: 'Safe Fallback',
      updatedAt: new Date().toISOString(),
      cached: false,
      data: getFallbackTrends(region),
      warning: 'Live trend provider is temporarily unavailable.',
    });
  }
}

function getFallbackTrends(region: string): TrendingSearch[] {
  const isId = region === 'ID';
  const now = new Date().toISOString();

  if (isId) {
    return [
      {
        id: `ID-timnas-indonesia-1`,
        keyword: 'Timnas Indonesia Kualifikasi Piala Dunia',
        rank: 1,
        region: 'ID',
        category: 'Sports',
        traffic: '500K+',
        trend_direction: 'up',
        trend_percentage: '+250%',
        source: 'Curated Trending Topics',
        source_url: 'https://trends.google.com',
        timestamp: now,
        created_at: now,
        news_title: 'Persiapan Timnas Indonesia jelang laga kualifikasi penting',
        opportunity_score: 92,
        is_ai_estimate: true,
      },
      {
        id: `ID-ai-tools-2`,
        keyword: 'AI Video Generator Viral',
        rank: 2,
        region: 'ID',
        category: 'Technology',
        traffic: '200K+',
        trend_direction: 'up',
        trend_percentage: '+180%',
        source: 'Curated Trending Topics',
        source_url: 'https://trends.google.com',
        timestamp: now,
        created_at: now,
        news_title: 'Perkembangan tools AI generasi video terbaru menarik perhatian kreator',
        opportunity_score: 88,
        is_ai_estimate: true,
      },
      {
        id: `ID-bisnis-digital-3`,
        keyword: 'Peluang Bisnis Digital Affiliate 2026',
        rank: 3,
        region: 'ID',
        category: 'Finance',
        traffic: '150K+',
        trend_direction: 'up',
        trend_percentage: '+140%',
        source: 'Curated Trending Topics',
        source_url: 'https://trends.google.com',
        timestamp: now,
        created_at: now,
        news_title: 'Tren penghasilan pasif dari digital marketing dan e-commerce',
        opportunity_score: 85,
        is_ai_estimate: true,
      },
      {
        id: `ID-kuliner-viral-4`,
        keyword: 'Resep Makanan Sehat Viral TikTok',
        rank: 4,
        region: 'ID',
        category: 'Lifestyle',
        traffic: '100K+',
        trend_direction: 'up',
        trend_percentage: '+110%',
        source: 'Curated Trending Topics',
        source_url: 'https://trends.google.com',
        timestamp: now,
        created_at: now,
        news_title: 'Resep menu praktis viral yang banyak dicoba warganet',
        opportunity_score: 79,
        is_ai_estimate: true,
      },
      {
        id: `ID-game-terbaru-5`,
        keyword: 'Game Petualangan Open World Terbaru',
        rank: 5,
        region: 'ID',
        category: 'Entertainment',
        traffic: '80K+',
        trend_direction: 'up',
        trend_percentage: '+95%',
        source: 'Curated Trending Topics',
        source_url: 'https://trends.google.com',
        timestamp: now,
        created_at: now,
        news_title: 'Peluncuran game RPG mobile dan konsol terbaru pekan ini',
        opportunity_score: 75,
        is_ai_estimate: true,
      }
    ];
  }

  return [
    {
      id: `US-ai-breakthroughs-1`,
      keyword: 'Generative AI Productivity Tools',
      rank: 1,
      region,
      category: 'Technology',
      traffic: '500K+',
      trend_direction: 'up',
      trend_percentage: '+300%',
      source: 'Curated Trending Topics',
      source_url: 'https://trends.google.com',
      timestamp: now,
      created_at: now,
      news_title: 'Breakthroughs in multimodal AI assistants transform workflows',
      opportunity_score: 94,
      is_ai_estimate: true,
    },
    {
      id: `US-remote-work-2`,
      keyword: 'Remote Work Productivity Hacks',
      rank: 2,
      region,
      category: 'Business',
      traffic: '250K+',
      trend_direction: 'up',
      trend_percentage: '+160%',
      source: 'Curated Trending Topics',
      source_url: 'https://trends.google.com',
      timestamp: now,
      created_at: now,
      news_title: 'Strategies for digital nomad lifestyles and asynchronous collaboration',
      opportunity_score: 86,
      is_ai_estimate: true,
    },
    {
      id: `US-sustainable-living-3`,
      keyword: 'Eco Friendly Home Upgrades',
      rank: 3,
      region,
      category: 'Lifestyle',
      traffic: '180K+',
      trend_direction: 'up',
      trend_percentage: '+120%',
      source: 'Curated Trending Topics',
      source_url: 'https://trends.google.com',
      timestamp: now,
      created_at: now,
      news_title: 'Consumers embrace energy-efficient and sustainable smart home solutions',
      opportunity_score: 81,
      is_ai_estimate: true,
    }
  ];
}
