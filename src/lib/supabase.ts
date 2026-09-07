import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tvirwhgvujcdutijggss.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  return {
    configured: isSupabaseConfigured,
    url: supabaseUrl,
    hasAnonKey: Boolean(supabaseAnonKey),
  };
}
