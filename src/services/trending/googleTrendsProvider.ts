import { XMLParser } from 'fast-xml-parser';
import { TrendingSearch, TrendDirection } from '../../types';
import { TrendingProvider, ProviderDocumentation } from './types';

export class GoogleTrendsProvider implements TrendingProvider {
  name = 'GoogleTrendsDailyRSS';

  static documentation: ProviderDocumentation = {
    name: 'Google Trends Daily RSS / Optional SerpApi Provider',
    type: 'Official Google Trends Daily RSS with optional SerpApi Trending Now',
    sourceUrl: 'https://trends.google.com/trending/rss',
    pricing: 'Google Trends RSS: public; SerpApi: separate provider pricing',
    rateLimit: 'Provider-dependent; application cache is used to reduce requests',
    authentication: 'None for Google Trends RSS; TRENDING_API_KEY for SerpApi',
    notes: 'Only provider-supplied metrics are returned. No fabricated traffic or percentage values are generated.'
  };

  isConfigured(): boolean {
    return true;
  }

  async getTrendingSearches(region: string, timeframe: string): Promise<TrendingSearch[]> {
    const geo = (region || 'ID').toUpperCase();
    const requestedTimeframe = (timeframe || '24h').toLowerCase();

    const apiKey = process.env.TRENDING_API_KEY?.trim();
    if (apiKey) {
      try {
        const serpApiUrl = new URL('https://serpapi.com/search.json');
        serpApiUrl.searchParams.set('engine', 'google_trends_trending_now');
        serpApiUrl.searchParams.set('geo', geo);
        serpApiUrl.searchParams.set('api_key', apiKey);

        const response = await fetch(serpApiUrl, {
          headers: { 'User-Agent': 'AITrendResearch/1.0' },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json.trending_searches)) {
            return json.trending_searches
              .slice(0, 10)
              .map((item: any, index: number) => this.formatSerpApiItem(item, index + 1, geo));
          }
        }
      } catch (error) {
        console.warn('SerpApi failed, falling back to Google Trends RSS:', error);
      }
    }

    // Google Trends public RSS is a daily trends feed. It does not expose
    // arbitrary 4h/24h/7d windows, so never pretend that it does.
    const rssUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Google Trends RSS responded with status ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: false });
    const parsed = parser.parse(xmlText);
    const rawItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    if (items.length === 0) {
      throw new Error(`No trending items found in Google Trends RSS feed for geo: ${geo}`);
    }

    return items.slice(0, 10).map((item: any, index: number) =>
      this.formatRssItem(item, index + 1, geo, requestedTimeframe)
    );
  }

  private formatSerpApiItem(item: any, rank: number, region: string): TrendingSearch {
    const keyword = String(item.query || item.title || '').trim();
    if (!keyword) throw new Error(`Trending provider returned an empty keyword at rank ${rank}`);

    const timestamp = new Date().toISOString();
    return {
      id: `${region}-${this.slug(keyword)}-${rank}`,
      keyword,
      rank,
      region,
      category: item.category || 'General',
      traffic: item.formatted_traffic || item.search_volume || '',
      trend_direction: this.normalizeDirection(item.trend_direction),
      trend_percentage: this.normalizePercentage(item.trend_percentage),
      source: 'Google Trends (SerpApi)',
      source_url: item.share_url || `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
      timestamp,
      created_at: timestamp,
      news_title: item.articles?.[0]?.title,
      image_url: item.articles?.[0]?.snippet_image,
    };
  }

  private formatRssItem(item: any, rank: number, region: string, timeframe: string): TrendingSearch {
    const keyword = String(item.title || item['ht:news_item_title'] || '').trim();
    if (!keyword) throw new Error(`Google Trends RSS returned an empty keyword at rank ${rank}`);

    const newsItem = Array.isArray(item['ht:news_item']) ? item['ht:news_item'][0] : item['ht:news_item'];
    const newsTitleRaw = newsItem?.['ht:news_item_title'] || item.description || '';
    const newsTitle = typeof newsTitleRaw === 'string'
      ? newsTitleRaw.replace(/<[^>]*>?/gm, '').trim().slice(0, 120)
      : '';
    const newsUrl = newsItem?.['ht:news_item_url'] || item.link ||
      `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
    const timestamp = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

    return {
      id: `${region}-${this.slug(keyword)}-${rank}`,
      keyword,
      rank,
      region,
      category: this.detectCategory(keyword, newsTitle),
      traffic: item['ht:approx_traffic'] ? String(item['ht:approx_traffic']) : '',
      trend_direction: 'up',
      trend_percentage: undefined,
      source: `Google Trends Daily RSS${timeframe !== 'daily' ? ' (daily feed)' : ''}`,
      source_url: newsUrl,
      timestamp,
      created_at: new Date().toISOString(),
      news_title: newsTitle,
      image_url: typeof item['ht:picture'] === 'string' ? item['ht:picture'] :
        typeof newsItem?.['ht:news_item_picture'] === 'string' ? newsItem['ht:news_item_picture'] : undefined,
    };
  }

  private normalizeDirection(value: unknown): TrendDirection {
    if (value === 'down' || value === 'stable' || value === 'up') return value;
    return 'up';
  }

  private normalizePercentage(value: unknown): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return `${value}%`;
    if (typeof value === 'string' && /^[-+]?\d+(\.\d+)?%$/.test(value.trim())) return value.trim();
    return undefined;
  }

  private slug(value: string): string {
    return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  }

  private detectCategory(keyword: string, snippet: string): string {
    const text = `${keyword} ${snippet}`.toLowerCase();
    if (/liga|juara|vs|gol|pertandingan|skor|madrid|barcelona|persib|timnas|world cup|football|bola|motogp|f1|badminton/.test(text)) return 'Sports';
    if (/film|bioskop|drama|trailer|netflix|actor|artis|konser|musik|album|kpop|idol|celebrity/.test(text)) return 'Entertainment';
    if (/saham|rupiah|dolar|investasi|crypto|bitcoin|ihsg|pajak|bisnis|ekonomi|market/.test(text)) return 'Finance';
    if (/\b(ai|artificial intelligence|apple|iphone|ipad|macbook|samsung|android|gemini|chatgpt|openai|software|apps?|gadget|nvidia|tech|technology|teknologi|chip|semiconductor|komputer|computer|laptop|hp|smartphone|ponsel|robot|cyber|internet|coding|developer|code|google|microsoft|meta|camera|kamera|device|hardware|cloud|telepon)\b/i.test(text)) return 'Technology';
    if (/presiden|menteri|pemilu|kpu|dpr|kebijakan|pemerintah|polisi|hukum|kasus/.test(text)) return 'Politics';
    return 'General';
  }
}
