# Vercel deployment

Set these environment variables in the Vercel project:

- `VITE_SUPABASE_URL=https://tvirwhgvujcdutijggss.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<Supabase anon key>`
- `SUPABASE_URL=https://tvirwhgvujcdutijggss.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>`
- `GEMINI_API_KEY=<Gemini API key>`
- `TRENDING_API_KEY=<optional provider key>`

Never expose `SUPABASE_SERVICE_ROLE_KEY` through `VITE_*` variables and never commit it to Git.

Build settings are provided by `vercel.json`.
