import { TrendingSearch } from '../types';

export function exportTrendsToCsv(trends: TrendingSearch[], filename = 'trending-searches.csv') {
  const headers = ['Rank', 'Keyword', 'Region', 'Category', 'Traffic', 'Trend', 'OpportunityScore', 'Timestamp'];
  
  const rows = trends.map(t => [
    t.rank,
    `"${(t.keyword || '').replace(/"/g, '""')}"`,
    t.region,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.traffic || '').replace(/"/g, '""')}"`,
    t.trend_direction,
    t.opportunity_score ?? 'N/A',
    `"${t.timestamp}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTrendsToJson(trends: TrendingSearch[], filename = 'trending-searches.json') {
  const jsonContent = JSON.stringify(trends, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyKeywordsToClipboard(trends: TrendingSearch[]): Promise<boolean> {
  const text = trends.map(t => `${t.rank}. ${t.keyword}`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy keywords:', err);
    return false;
  }
}
