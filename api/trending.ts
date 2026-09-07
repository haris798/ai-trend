import type { IncomingMessage, ServerResponse } from 'http';
import { getTrendingProvider } from '../src/services/trending';
import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const region = ((req.query?.region as string) || 'ID').toUpperCase();
  const timeframe = (req.query?.timeframe as string) || '24h';
  const forceRefresh = req.query?.refresh === 'true';

  try {
    if (!forceRefresh) {
      const cachedData = await CacheService.getTrending(region, timeframe);
      if (cachedData && cachedData.length > 0) {
        return res.status(200).json({
          success: true,
          region,
          timeframe,
          source: cachedData[0]?.source || 'Cache (Supabase / In-Memory)',
          updatedAt: cachedData[0]?.timestamp || new Date().toISOString(),
          cached: true,
          data: cachedData,
        });
      }
    }

    const provider = getTrendingProvider();
    const freshData = await provider.getTrendingSearches(region, timeframe);
    await CacheService.setTrending(region, timeframe, freshData);

    return res.status(200).json({
      success: true,
      region,
      timeframe,
      source: provider.name,
      updatedAt: new Date().toISOString(),
      cached: false,
      data: freshData,
    });
  } catch (error: any) {
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
}
