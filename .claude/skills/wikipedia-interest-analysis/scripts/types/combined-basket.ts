import type { DailySeries } from './daily-series.ts';

export type CombinedBasket = {
  daily: DailySeries;
  usedIndexes: number[];
  excluded: string[];
};
