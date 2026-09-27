/** First day of a month in the Pageviews API format: '2024-01' → '20240101'. */
export function apiFirstDay(month: string): string {
  return `${month.replace('-', '')}01`;
}
