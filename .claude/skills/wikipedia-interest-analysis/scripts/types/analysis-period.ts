import type { MonthSpan } from './month-span.ts';

export type AnalysisPeriod = MonthSpan & {
  months: number;
};
