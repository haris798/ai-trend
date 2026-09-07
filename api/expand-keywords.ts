import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, region } = req.body || {};
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }

  try {
    const keywords = await GeminiTrendService.expandKeywords(keyword, region || 'ID');
    await CacheService.recordAiUsage('keywords', keyword, 750);
    return res.status(200).json({ success: true, data: keywords });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
