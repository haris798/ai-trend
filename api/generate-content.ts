import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, region, analysis } = req.body || {};
  const customApiKey = String(req.headers['x-gemini-api-key'] || '').trim();

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }

  try {
    const ideas = await GeminiTrendService.generateContentIdeas(keyword, region || 'ID', analysis, customApiKey);
    await CacheService.recordAiUsage('content_generation', keyword, 1200);
    return res.status(200).json({ success: true, data: ideas });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
