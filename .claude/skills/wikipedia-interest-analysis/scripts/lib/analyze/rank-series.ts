import type { RankRow } from '../../types/rank-row.ts';
import type { RankingWeights } from '../../types/ranking-weights.ts';
import type { SeriesResult } from '../../types/series-result.ts';
import { CONFIDENCE_FACTOR } from './confidence-factor.ts';

/** Only a confirmed direction earns (or loses) growth points: +1.5% "flat" or a one-off level shift is not growth. */
function growthOf(series: SeriesResult): number {
  if (series.direction === 'growing' || series.direction === 'declining') {
    return series.metrics!.yoyShareRobustPct ?? series.metrics!.trendPctPerYear ?? 0;
  }

  return 0;
}

function percentileRank(values: number[], value: number): number {
  return values.length === 1 ? 1 : values.filter((other) => other < value).length / (values.length - 1);
}

/** Transparent score: weighted percentile rank of growth and size, discounted by confidence. */
export function rankSeries(series: SeriesResult[], weights: RankingWeights): RankRow[] {
  const analyzed = series.filter((item) => item.status === 'ok' && item.metrics);

  if (analyzed.length < 2) {
    return [];
  }

  const growthValues = analyzed.map(growthOf);
  const sizeValues = analyzed.map((item) => item.metrics!.avgMonthlyViews);
  const weightSum = weights.growth + weights.size || 1;

  return analyzed
    .map((item) => {
      const weightedPercentile = (weights.growth * percentileRank(growthValues, growthOf(item)) + weights.size * percentileRank(sizeValues, item.metrics!.avgMonthlyViews)) / weightSum;

      return {
        label: item.label,
        score: Math.round(weightedPercentile * CONFIDENCE_FACTOR[item.confidence!] * 100),
        growthPct: item.metrics!.yoyShareRobustPct ?? item.metrics!.trendPctPerYear,
        avgMonthlyViews: item.metrics!.avgMonthlyViews,
        confidence: item.confidence!,
      };
    })
    .sort((left, right) => right.score - left.score);
}
