import { CacheService } from '../src/services/cache';
import { sendJson, getClientId, getCustomApiKey } from './_utils';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const clientId = getClientId(req);
  const customApiKey = getCustomApiKey(req);
  const hasByok = Boolean(customApiKey && customApiKey.length > 10);

  try {
    const stats = await CacheService.getAiUsageStats(clientId, hasByok);
    return sendJson(res, 200, { success: true, data: stats });
  } catch (error: any) {
    return sendJson(res, 500, { success: false, error: error.message });
  }
}
