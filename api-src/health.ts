import type { IncomingMessage, ServerResponse } from 'node:http';

interface JsonResponse extends ServerResponse {
  json?: (body: unknown) => void;
  status?: (code: number) => JsonResponse;
}

type RequestLike = IncomingMessage;

function sendJson(res: JsonResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default function handler(_req: RequestLike, res: JsonResponse) {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  sendJson(res, 200, {
    success: true,
    service: 'ai-trend',
    supabaseConfigured: hasSupabase,
    geminiConfigured: hasGemini,
    timestamp: new Date().toISOString(),
  });
}
