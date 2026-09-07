import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tvirwhgvujcdutijggss.supabase.co';
const RUNTIME_CONFIG_KEY = 'ai_trend_runtime_config';

type RuntimeConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(RUNTIME_CONFIG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      supabaseUrl: typeof parsed?.supabaseUrl === 'string' ? parsed.supabaseUrl.trim() : undefined,
      supabaseAnonKey: typeof parsed?.supabaseAnonKey === 'string' ? parsed.supabaseAnonKey.trim() : undefined,
    };
  } catch {
    return {};
  }
}

const runtimeConfig = getRuntimeConfig();
const supabaseUrl = runtimeConfig.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = runtimeConfig.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.includes('.supabase.co')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
  }
}

export const supabase = client;

export function getSupabaseStatus(): {
  configured: boolean;
  url: string;
  hasAnonKey: boolean;
  source: 'browser' | 'environment';
} {
  const current = getRuntimeConfig();
  const currentUrl = current.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const currentAnonKey = current.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    configured: Boolean(currentUrl && currentAnonKey && currentUrl.includes('.supabase.co')),
    url: currentUrl,
    hasAnonKey: Boolean(currentAnonKey),
    source: current.supabaseUrl || current.supabaseAnonKey ? 'browser' : 'environment',
  };
}
