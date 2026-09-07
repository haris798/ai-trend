/**
 * Utility to manage a persistent client identifier and headers for API calls,
 * including BYOK (Bring-Your-Own-Key) personal Gemini API keys.
 */
export function getClientId(): string {
  try {
    let id = localStorage.getItem('ai_trend_client_id');
    if (!id || id === 'legacy-client') {
      id = 'client_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
      localStorage.setItem('ai_trend_client_id', id);
    }
    return id;
  } catch {
    return 'default-client';
  }
}

export function getRuntimeGeminiApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('ai_trend_runtime_config');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.geminiApiKey === 'string' && parsed.geminiApiKey.trim().length > 10
      ? parsed.geminiApiKey.trim()
      : null;
  } catch {
    return null;
  }
}

export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'x-client-id': getClientId(),
    ...extraHeaders,
  };
  const geminiKey = getRuntimeGeminiApiKey();
  if (geminiKey) {
    headers['x-gemini-api-key'] = geminiKey;
  }
  return headers;
}
