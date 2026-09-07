import { CacheService } from '../src/services/cache';

export default async function handler(req: any, res: any) {
  try {
    const stats = await CacheService.getAiUsageStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
