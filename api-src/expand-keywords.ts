import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';
import { sendJson, parseBody, getCustomApiKey } from './_utils';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const { keyword, region } = body || {};
  const customApiKey = getCustomApiKey(req);

  if (!keyword) {
    return sendJson(res, 400, { error: 'Keyword is required.' });
  }

  try {
    const keywords = await GeminiTrendService.expandKeywords(keyword, region || 'ID', customApiKey || undefined);
    await CacheService.recordAiUsage('keywords', keyword, 750);
    return sendJson(res, 200, { success: true, data: keywords });
  } catch (error: any) {
    return sendJson(res, 500, { success: false, error: error.message });
  }
}
