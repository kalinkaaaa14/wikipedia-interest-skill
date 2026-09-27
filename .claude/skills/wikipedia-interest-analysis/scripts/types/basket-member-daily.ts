import type { DailySeries } from './daily-series.ts';

export type BasketMemberDaily = {
  label: string;
  daily: DailySeries | null;
};
