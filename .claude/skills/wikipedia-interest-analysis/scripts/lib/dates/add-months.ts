import { monthKey } from './month-key.ts';

export function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split('-').map(Number);

  return monthKey(new Date(Date.UTC(year, monthNumber - 1 + count, 1)));
}
