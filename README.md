# AI Trend Research Engine

A high-performance digital trend discovery and monetization intelligence platform. It ingests real-time Google Trending searches across international regions, performs multi-dimensional AI market analysis with Google Gemini (`gemini-3.8-flash`), and generates actionable commercial outputs for content creators, self-publishers, affiliate marketers, and digital entrepreneurs.

---

## Key Capabilities

- **Real-Time Trend Radar:** Pulls live trending searches by region (e.g. Indonesia, United States, United Kingdom, Japan, and more) via Google Trends RSS and SerpApi.
- **Gemini AI Deep Trend Analysis:**
  - **Weighted Opportunity Score (0-100):** Evaluates Trend Momentum (30%), Search Intent (20%), Content Potential (20%), Commercial Intent (15%), and Monetization Potential (15%).
  - **Search Intent & Demographics:** Classifies intent (Informational, Transactional, etc.), audience personas, longevity, and competition levels.
- **Multi-Platform Content Generator:** Ready-to-use hooks, title options, and content angles tailored for Blogs, YouTube, TikTok/Shorts, and Pinterest.
- **Amazon KDP Concept Generator:** Book types, titles, subtitles, chapter outlines, target audiences, and evergreen monetization potential.
- **7-Channel Monetization Breakdown:** Strategy scores and action steps for Affiliate, Display Ads, Digital Products, Amazon KDP, YouTube, Newsletters, and Services.
- **Comparative Analysis Matrix:** Compare up to 5 trending keywords side-by-side using interactive Recharts radar & bar charts.
- **Multi-Format Data Export:** Export curated trend reports and ideas to CSV, JSON, and formatted Markdown.
- **Multi-Tier Resilient Caching:** High-speed in-memory caching with persistent Supabase PostgreSQL synchronization and graceful fallback.

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React icons, Recharts, Motion.
- **Backend Architecture:**
  - Local Development: Express server with integrated Vite middleware (`server.ts`).
  - Production / Serverless: Vercel Serverless Functions (`/api/*`).
- **AI Engine:** Google GenAI SDK (`@google/genai`) interfacing with Gemini 3.8 Flash with automatic fallback resilience.
- **Database & Cache:** Supabase PostgreSQL with Row Level Security (RLS) & UUID extensions + in-memory fallback tier.

---

## Quick Start

### 1. Prerequisites
- Node.js v18+ (tested on Node v20/v24)
- npm or bun

### 2. Installation
```bash
git clone <repository-url>
cd ai-trend
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the following variables:
```ini
# Client-safe Supabase settings (browser runtime)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-side Supabase settings (bypasses RLS for secure operations)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API key
GEMINI_API_KEY=your-gemini-api-key

# Optional: SerpApi key (falls back to Google Trends RSS if omitted)
TRENDING_API_KEY=

# Development mode (set to true for offline mock data)
DEVELOPMENT_MODE=false
```

### 4. Database Setup (Supabase)
Run the SQL migration files located in `supabase/migrations/` in your Supabase SQL Editor:
1. `20260907_initial_schema.sql`
2. `20260907_fix_schema.sql`
3. `20260907_saved_trends_compat.sql`
4. `20260907_saved_trends_compat_v2.sql`

*Note: If Supabase is not yet configured, the application will automatically fall back to the in-memory cache.*

### 5. Running the Application
```bash
# Start development server (Express + Vite)
npm run dev

# Build for production
npm run build

# Start production build locally
npm run start
```
Open `http://localhost:3000` in your browser.

---

## Vercel Deployment

1. Import the repository into your Vercel Dashboard.
2. Configure the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `TRENDING_API_KEY` (optional)
3. Deploy! Vercel will build the frontend via `npm run build:vercel` and deploy serverless functions from `/api`.

---

## License
MIT
