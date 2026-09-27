import { addMonths } from './add-months.ts';

/** Inclusive list of month keys from `start` to `end`. */
export function monthRange(start: string, end: string): string[] {
  const months: string[] = [];

  for (let month = start; month <= end; month = addMonths(month, 1)) {
    months.push(month);
  }

  return months;
}
