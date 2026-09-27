import type { RankingWeights } from './ranking-weights.ts';
import type { SeriesSpec } from './series-spec.ts';

export type AnalysisSpec = {
  series: SeriesSpec[];
  months: number;
  /** 'YYYY-MM', the last month included. */
  end: string;
  weights: RankingWeights;
};
