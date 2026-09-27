import { monthKey } from './month-key.ts';

/** The last fully completed month relative to `now`. */
export function lastCompleteMonth(now = new Date()): string {
  return monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
}
