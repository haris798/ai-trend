import { TrendingProvider } from './types';
import { GoogleTrendsProvider } from './googleTrendsProvider';
import { MockProvider } from './mockProvider';
import { FallbackProvider } from './fallbackProvider';

export * from './types';
export * from './googleTrendsProvider';
export * from './mockProvider';
export * from './fallbackProvider';

export function getTrendingProvider(): TrendingProvider {
  // If explicitly in development mode, use MockProvider for local offline testing
  if (process.env.DEVELOPMENT_MODE === 'true') {
    return new MockProvider();
  }

  // Production provider: Real Google Trends RSS & SerpApi extension
  return new GoogleTrendsProvider();
}
