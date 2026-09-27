import type { AnalysisPeriod } from './analysis-period.ts';
import type { AnalysisSpec } from './analysis-spec.ts';
import type { RankRow } from './rank-row.ts';
import type { SeriesResult } from './series-result.ts';

export type AnalysisResult = {
  spec: AnalysisSpec;
  period: AnalysisPeriod;
  series: SeriesResult[];
  ranking: RankRow[];
  findings: string[];
  generatedAt: string;
};
