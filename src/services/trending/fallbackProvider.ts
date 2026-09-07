import { TrendingSearch } from '../../types';
import { TrendingProvider } from './types';

export class FallbackProvider implements TrendingProvider {
  name = 'FallbackProvider';

  isConfigured(): boolean {
    return true;
  }

  async getTrendingSearches(region: string, timeframe: string): Promise<TrendingSearch[]> {
    throw new Error(
      `Live trending provider is not configured or Google Trends RSS is temporarily rate-limited for region '${region}'. Configure TRENDING_API_KEY (SerpApi/RapidAPI) or wait 5 minutes before retrying.`
    );
  }
}
