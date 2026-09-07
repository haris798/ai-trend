import { XMLParser } from 'fast-xml-parser';
import { TrendingSearch, TrendDirection } from '../../types';
import { TrendingProvider, ProviderDocumentation } from './types';

export class GoogleTrendsProvider implements TrendingProvider {
  name = 'GoogleTrendsDailyRSS';

  static documentation: ProviderDocumentation = {
    name: 'Google Trends Daily RSS / SerpApi Provider',
    type: 'Official Public RSS Feed & Optional SerpApi Extension',
    sourceUrl: 'https://trends.google.com/trending/rss',
    pricing: 'Free (RSS Feed) / Free Tier 100 searches/mo (SerpApi)',
    rateLimit: 'Standard web rate-limiting applies; 5-min caching in Supabase strongly enforced',
    authentication: 'None required for official RSS; Optional TRENDING_API_KEY for SerpApi / RapidAPI',
    notes: 'Accesses official daily trending topics published by Google Trends without aggressive scraping or CAPTCHA bypass.'
  };

  isConfigured(): boolean {
    // Google Trends Daily RSS is available publicly by default.
    return true;
  }

  async getTrendingSearches(region: string, timeframe: string): Promise<TrendingSearch[]> {
    const geo = (region || 'ID').toUpperCase();

    // 1. Check if external SerpApi key is provided
    const apiKey = process.env.TRENDING_API_KEY;
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const serpApiUrl = `https://serpapi.com/search.json?engine=google_trends_trending_now&geo=${geo}&api_key=${apiKey}`;
        const res = await fetch(serpApiUrl, { headers: { 'User-Agent': 'AITrendResearch/1.0' } });
        if (res.ok) {
          const json = await res.json();
          if (json.trending_searches && Array.isArray(json.trending_searches)) {
            return json.trending_searches.slice(0, 10).map((item: any, index: number) => {
              const kw = item.query || item.title || `Trend #${index + 1}`;
              return {
                id: `${geo}-${encodeURIComponent(kw)}-${Date.now()}-${index}`,
                keyword: kw,
                rank: index + 1,
                region: geo,
                category: item.category || 'General',
                traffic: item.formatted_traffic || item.search_volume || '50K+',
                trend_direction: 'up' as TrendDirection,
                trend_percentage: '+100%',
                source: 'Google Trends (SerpApi)',
                source_url: item.share_url || `https://www.google.com/search?q=${encodeURIComponent(kw)}`,
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString(),
                news_title: item.articles?.[0]?.title,
                image_url: item.articles?.[0]?.snippet_image,
              };
            });
          }
        }
      } catch (err) {
        console.warn('SerpApi failed, falling back to Google Trends RSS feed:', err);
      }
    }

    // 2. Official Google Trends Daily Trending RSS Feed
    const rssUrl = `https://trends.google.com/trending/rss?geo=${geo}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Google Trends RSS responded with status ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: false
      });

      const parsed = parser.parse(xmlText);
      const items = parsed?.rss?.channel?.item;

      if (!items || !Array.isArray(items)) {
        if (items && typeof items === 'object') {
          // Single item in XML
          return [this.formatItem(items, 1, geo)];
        }
        throw new Error(`No trending items found in Google Trends RSS feed for geo: ${geo}`);
      }

      return items.slice(0, 10).map((item: any, idx: number) => this.formatItem(item, idx + 1, geo));
    } catch (error: any) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private formatItem(item: any, rank: number, region: string): TrendingSearch {
    const rawTitle = item.title || item['ht:news_item_title'] || `Trending ${rank}`;
    const keyword = typeof rawTitle === 'string' ? rawTitle.trim() : String(rawTitle);
    const traffic = item['ht:approx_traffic'] ? String(item['ht:approx_traffic']) : '20K+';
    
    // Extract first news item if available
    const newsItem = Array.isArray(item['ht:news_item']) ? item['ht:news_item'][0] : item['ht:news_item'];
    const newsTitle = newsItem?.['ht:news_item_title'] || item.description || '';
    const newsUrl = newsItem?.['ht:news_item_url'] || item.link || `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
    const imageUrl = item['ht:picture'] || newsItem?.['ht:news_item_picture'] || '';

    return {
      id: `${region}-${keyword.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${rank}`,
      keyword,
      rank,
      region,
      category: this.detectCategory(keyword, newsTitle),
      traffic,
      trend_direction: 'up',
      trend_percentage: rank <= 3 ? '+150%' : rank <= 6 ? '+85%' : '+45%',
      source: 'Google Trends',
      source_url: newsUrl,
      timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString(),
      news_title: typeof newsTitle === 'string' ? newsTitle.replace(/<[^>]*>?/gm, '').slice(0, 120) : '',
      image_url: typeof imageUrl === 'string' ? imageUrl : undefined,
    };
  }

  private detectCategory(keyword: string, snippet: string): string {
    const text = `${keyword} ${snippet}`.toLowerCase();
    if (/liga|juara|vs|gol|pertandingan|skor|madrid|barcelona|persib|timnas|world cup|football|bola|motogp|f1|badminton/.test(text)) {
      return 'Sports';
    }
    if (/film|bioskop|drama|trailer|netflix|actor|artis|konser|musik|album|kpop|idol|celebrity/.test(text)) {
      return 'Entertainment';
    }
    if (/saham|rupiah|dolar|investasi|crypto|bitcoin|ihsg|pajak|bisnis|ekonomi|market/.test(text)) {
      return 'Finance';
    }
    if (/\b(ai|artificial intelligence|apple|iphone|ipad|macbook|samsung|android|gemini|chatgpt|openai|software|apps?|gadget|nvidia|tech|technology|teknologi|chip|semiconductor|komputer|computer|laptop|hp|smartphone|ponsel|robot|cyber|internet|coding|developer|code|google|microsoft|meta|camera|kamera|device|hardware|cloud|telepon)\b/i.test(text)) {
      return 'Technology';
    }
    if (/presiden|menteri|pemilu|kpu|dpr|kebijakan|pemerintah|polisi|hukum|kasus/.test(text)) {
      return 'Politics';
    }
    return 'General';
  }
}
