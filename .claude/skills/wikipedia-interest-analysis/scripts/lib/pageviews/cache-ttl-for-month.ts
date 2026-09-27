import { lastCompleteMonth } from '../dates/last-complete-month.ts';

/** Complete past months never change, so they are cached forever; anything touching the current month expires daily. */
export function cacheTtlForMonth(endMonth: string): number {
  return endMonth <= lastCompleteMonth() ? Infinity : 24 * 3600;
}
