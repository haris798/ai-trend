import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function json(res: any, status: number, body: unknown) {
  return res.status(status).json(body);
}

function getClientId(req: any) {
  const value = String(req.headers?.['x-client-id'] || '').trim();
  return value && value.length <= 128 ? value : null;
}

export default async function handler(req: any, res: any) {
  const supabase = getSupabase();
  if (!supabase) return json(res, 503, { success: false, error: 'Supabase server configuration is missing' });

  const clientId = getClientId(req);
  if (!clientId) return json(res, 400, { success: false, error: 'Valid client ID is required' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('alerts')
        .select('id,keyword,region,target_rank,enabled,created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(res, 200, { success: true, data: data || [] });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const keyword = String(body.keyword || '').trim();
      const region = String(body.region || 'ID').trim().toUpperCase();
      const targetRank = Number(body.targetRank ?? body.target_rank ?? 10);
      const enabled = body.enabled !== false;

      if (!keyword || keyword.length > 200) return json(res, 400, { success: false, error: 'Valid keyword is required' });
      if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank > 100) return json(res, 400, { success: false, error: 'Target rank must be between 1 and 100' });

      const { data, error } = await supabase
        .from('alerts')
        .insert({ client_id: clientId, keyword, region, target_rank: targetRank, enabled })
        .select('id,keyword,region,target_rank,enabled,created_at')
        .single();
      if (error) throw error;
      return json(res, 201, { success: true, data });
    }

    if (req.method === 'PATCH') {
      const id = String(req.query?.id || req.body?.id || '').trim();
      if (!id) return json(res, 400, { success: false, error: 'Alert ID is required' });
      const updates: Record<string, unknown> = {};
      if (req.body?.enabled !== undefined) updates.enabled = Boolean(req.body.enabled);
      if (req.body?.targetRank !== undefined || req.body?.target_rank !== undefined) {
        const targetRank = Number(req.body.targetRank ?? req.body.target_rank);
        if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank > 100) return json(res, 400, { success: false, error: 'Target rank must be between 1 and 100' });
        updates.target_rank = targetRank;
      }
      const { error } = await supabase.from('alerts').update(updates).eq('id', id).eq('client_id', clientId);
      if (error) throw error;
      return json(res, 200, { success: true });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || req.body?.id || '').trim();
      if (!id) return json(res, 400, { success: false, error: 'Alert ID is required' });
      const { error } = await supabase.from('alerts').delete().eq('id', id).eq('client_id', clientId);
      if (error) throw error;
      return json(res, 200, { success: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return json(res, 405, { success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[alerts]', error?.message || error);
    return json(res, 500, { success: false, error: 'Alerts operation failed' });
  }
}
