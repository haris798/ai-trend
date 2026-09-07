import { GeminiTrendService } from '../src/services/gemini';
import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, region, category } = req.body || {};
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }

  try {
    const monetization = await GeminiTrendService.analyzeMonetization(keyword, region || 'ID', category || 'General');
    await CacheService.recordAiUsage('analysis', keyword, 650);
    return res.status(200).json({ success: true, data: monetization });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
