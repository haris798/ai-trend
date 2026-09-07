import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tvirwhgvujcdutijggss.supabase.co';
const RUNTIME_CONFIG_KEY = 'ai_trend_runtime_config';

type RuntimeConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getRuntimeConfig(): RuntimeConfig {
  try {
    const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const runtimeConfig = typeof window !== 'undefined' ? getRuntimeConfig() : {};
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
} {
  const current = typeof window !== 'undefined' ? getRuntimeConfig() : {};
  const currentUrl = current.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const currentAnonKey = current.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    configured: Boolean(currentUrl && currentAnonKey && currentUrl.includes('.supabase.co')),
    url: currentUrl,
    hasAnonKey: Boolean(currentAnonKey),
  };
}
