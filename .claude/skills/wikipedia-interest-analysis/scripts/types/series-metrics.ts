import type { LevelShiftSummary } from './level-shift-summary.ts';
import type { SpikeDay } from './spike-day.ts';

export type SeriesMetrics = {
  avgMonthlyViews: number;
  avgPerMillion: number;
  yoyViewsPct: number | null;
  yoySharePct: number | null;
  yoyShareRobustPct: number | null;
  trendPctPerYear: number | null;
  trendP: number | null;
  spikeSharePct: number;
  topSpikes: SpikeDay[];
  /** All spike days, for cross-language comparison. */
  spikeDates: string[];
  firstDataMonth: string;
  /** '09' etc. when there is strong yearly seasonality. */
  peakMonth: string | null;
  /** Last 12 months, relative to the edition (1 = the same weekly rhythm). */
  weekdayRatio: number | null;
  /** The same, in the peak calendar month only. */
  peakWeekdayRatio: number | null;
  levelShift: LevelShiftSummary | null;
};
