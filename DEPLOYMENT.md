# Deployment

Target: Vercel + Supabase.

Required Vercel environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY
- TRENDING_API_KEY (optional)

Keep SUPABASE_SERVICE_ROLE_KEY server-only. Never prefix it with VITE_ and never commit it.
