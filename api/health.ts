import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  return res.status(200).json({ success: true, service: 'ai-trend', supabaseConfigured: hasSupabase, geminiConfigured: hasGemini, timestamp: new Date().toISOString() });
}
