import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  const clientId = String(req.headers['x-client-id'] || req.query?.clientId || 'default-client').trim();
  const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();
  const hasByok = Boolean(customApiKey && customApiKey.length > 10);

  try {
    const stats = await CacheService.getAiUsageStats(clientId, hasByok);
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
