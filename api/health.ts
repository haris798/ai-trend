import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const body = JSON.stringify({
    success: true,
    service: 'ai-trend',
    supabaseConfigured: hasSupabase,
    geminiConfigured: hasGemini,
    timestamp: new Date().toISOString(),
  });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
}
