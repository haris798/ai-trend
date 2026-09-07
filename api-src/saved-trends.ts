import type { IncomingMessage, ServerResponse } from 'node:http';
import { CacheService } from '../src/services/cache';

type RequestLike = IncomingMessage & { body?: any; query?: Record<string, unknown> };
interface JsonResponse extends ServerResponse {}

function json(res: JsonResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req: RequestLike): Promise<any> {
  if (req.body !== undefined) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export default async function handler(req: RequestLike, res: JsonResponse) {
  const clientId = String(req.headers['x-client-id'] || req.query?.clientId || 'default-client').trim();
  if (!clientId || clientId.length > 128) {
    return json(res, 400, { success: false, error: 'Valid client ID is required' });
  }

  try {
    const body = await readBody(req);
    const query = req.query || {};

    if (req.method === 'GET') {
      const data = await CacheService.getSavedTrends(clientId);
      return json(res, 200, { success: true, data });
    }

    if (req.method === 'POST') {
      const trend = body?.trend || body;
      if (!trend?.id || !trend?.keyword) {
        return json(res, 400, { success: false, error: 'A valid trend is required' });
      }
      await CacheService.setSavedTrend(clientId, trend);
      return json(res, 200, { success: true });
    }

    if (req.method === 'DELETE') {
      const trendId = String(query.id || body?.id || '').trim();
      if (!trendId) {
        return json(res, 400, { success: false, error: 'Trend ID is required' });
      }
      await CacheService.deleteSavedTrend(clientId, trendId);
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[saved-trends]', error?.message || error);
    return json(res, 500, { success: false, error: 'Saved trends operation failed' });
  }
}
