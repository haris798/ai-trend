import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ServerResponseLike extends ServerResponse {
  json?: (body: unknown) => void;
  status?: (code: number) => ServerResponseLike;
}

export type ServerRequestLike = IncomingMessage & {
  body?: any;
  query?: Record<string, unknown>;
};

/**
 * Robust JSON responder that works in Express, Vercel (@vercel/node),
 * and vanilla Node.js http.ServerResponse environments.
 */
export function sendJson(res: any, status: number, body: unknown, headers?: Record<string, string>) {
  if (headers && typeof res.setHeader === 'function') {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }

  // Express or @vercel/node enhanced response
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(body);
  }

  // Vanilla Node.js http.ServerResponse
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-client-id, x-gemini-api-key');
  }
  res.end(JSON.stringify(body));
}

/**
 * Safely parse query parameters from either pre-parsed req.query or raw req.url
 */
export function parseQuery(req: any): Record<string, string> {
  const result: Record<string, string> = {};

  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        result[key] = value[0];
      }
    }
    return result;
  }

  try {
    const rawUrl = req.url || '/';
    const host = req.headers?.host || 'localhost';
    const url = new URL(rawUrl, `http://${host}`);
    url.searchParams.forEach((val, key) => {
      result[key] = val;
    });
  } catch {
    // Ignore URL parse failure
  }

  return result;
}

/**
 * Safely parse JSON request body from pre-parsed req.body or raw stream chunks
 */
export async function parseBody<T = any>(req: any): Promise<T> {
  if (req.body !== undefined) {
    if (typeof req.body === 'object' && req.body !== null) {
      return req.body as T;
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body) as T;
      } catch {
        return {} as T;
      }
    }
  }

  const chunks: Buffer[] = [];
  try {
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (!chunks.length) return {} as T;
    const raw = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Safely extract client ID from request headers or query/body
 */
export function getClientId(req: any, body?: any): string {
  const headerId = req.headers?.['x-client-id'];
  if (typeof headerId === 'string' && headerId.trim()) return headerId.trim();
  if (Array.isArray(headerId) && headerId[0]) return String(headerId[0]).trim();
  if (body?.clientId && typeof body.clientId === 'string') return body.clientId.trim();
  const query = parseQuery(req);
  if (query.clientId) return query.clientId.trim();
  return 'default-client';
}

/**
 * Safely extract custom Gemini API key from request headers
 */
export function getCustomApiKey(req: any): string {
  const key = req.headers?.['x-gemini-api-key'];
  if (typeof key === 'string' && key.trim()) return key.trim();
  if (Array.isArray(key) && key[0]) return String(key[0]).trim();
  return '';
}
