import { lastCompleteMonth } from '../dates/last-complete-month.ts';

/** The default last month of an analysis: the last complete month. */
export function defaultEnd(): string {
  return lastCompleteMonth();
}
