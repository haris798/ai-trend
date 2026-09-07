import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function json(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabase();
  if (!supabase) return json(res, 503, { success: false, error: 'Supabase server configuration is missing' });

  const clientId = String(req.headers['x-client-id'] || '').trim();
  if (!clientId || clientId.length > 128) return json(res, 400, { success: false, error: 'Valid client ID is required' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('saved_trends').select('id,trend_id,trend_data,created_at').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, { success: true, data: (data || []).map(row => row.trend_data).filter(Boolean) });
    }

    if (req.method === 'POST') {
      const trend = req.body?.trend;
      if (!trend?.id || !trend?.keyword) return json(res, 400, { success: false, error: 'A valid trend is required' });
      const { error } = await supabase.from('saved_trends').upsert({ client_id: clientId, trend_id: String(trend.id), trend_data: trend }, { onConflict: 'client_id,trend_id' });
      if (error) throw error;
      return json(res, 200, { success: true });
    }

    if (req.method === 'DELETE') {
      const trendId = String(req.query.id || req.body?.id || '').trim();
      if (!trendId) return json(res, 400, { success: false, error: 'Trend ID is required' });
      const { error } = await supabase.from('saved_trends').delete().eq('client_id', clientId).eq('trend_id', trendId);
      if (error) throw error;
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[saved-trends]', error?.message || error);
    return json(res, 500, { success: false, error: 'Saved trends operation failed' });
  }
}
