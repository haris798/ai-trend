import type { IncomingMessage, ServerResponse } from 'node:http';
import { CacheService } from '../src/services/cache';

type RequestLike = IncomingMessage & { query?: Record<string, unknown> };
interface JsonResponse extends ServerResponse {}

function json(res: JsonResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req: RequestLike, res: JsonResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  const query = req.query || {};
  const region = ((query.region as string) || 'ID').toUpperCase();
  const timeframe = ((query.timeframe as string) || '24h').toLowerCase();

  try {
    const data = await CacheService.getHistory(region, timeframe);
    return json(res, 200, { success: true, region, timeframe, data });
  } catch (error: any) {
    console.error('[history]', error?.message || error);
    return json(res, 500, { success: false, error: 'Failed to retrieve trend history' });
  }
}
