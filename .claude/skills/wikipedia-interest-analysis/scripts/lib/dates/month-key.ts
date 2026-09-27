/** 'YYYY-MM' of a date, in UTC like the Pageviews API. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
