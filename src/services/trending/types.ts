import { TrendingSearch } from '../../types';

export interface TrendingProvider {
  name: string;
  isConfigured(): boolean;
  getTrendingSearches(region: string, timeframe: string): Promise<TrendingSearch[]>;
}

export interface ProviderDocumentation {
  name: string;
  type: string;
  sourceUrl: string;
  pricing: string;
  rateLimit: string;
  authentication: string;
  notes: string;
}
