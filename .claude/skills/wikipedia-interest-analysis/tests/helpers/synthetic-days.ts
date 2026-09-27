import { apiLastDay } from '../../scripts/lib/dates/api-last-day.ts';
import type { DailySeries } from '../../scripts/types/daily-series.ts';

/** Daily article views from a per-month rule, and a flat edition of 1M views/day. */
export function syntheticDays(months: string[], viewsPerDay: (monthIndex: number) => number) {
  const days = months.flatMap((month) => Array.from({ length: Number(apiLastDay(month).slice(6)) }, (_slot, dayIndex) => `${month}-${String(dayIndex + 1).padStart(2, '0')}`));
  const article: DailySeries = new Map(days.map((day) => [day, viewsPerDay(months.indexOf(day.slice(0, 7)))]));
  const edition: DailySeries = new Map(days.map((day) => [day, 1_000_000]));

  return { days, article, edition };
}
