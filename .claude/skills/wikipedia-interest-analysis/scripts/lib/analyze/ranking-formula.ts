import type { RankingWeights } from '../../types/ranking-weights.ts';
import { CONFIDENCE_FACTOR } from './confidence-factor.ts';

/** The ranking score in words, with this run's weights, so the agent can explain it without paraphrasing the code. */
export function rankingFormula(weights: RankingWeights): string {
  const weightSum = weights.growth + weights.size || 1;
  const growthWeight = +(weights.growth / weightSum).toFixed(2);
  const sizeWeight = +(weights.size / weightSum).toFixed(2);

  return `score = 100 × (${growthWeight} × growth percentile + ${sizeWeight} × size percentile) × confidence factor ` +
    `(high ${CONFIDENCE_FACTOR.high}, medium ${CONFIDENCE_FACTOR.medium}, low ${CONFIDENCE_FACTOR.low}). ` +
    'Growth = share YoY with spikes removed, counted only for growing/declining series (flat and unclear count as 0); size = views/month; percentiles are ranks within this run.';
}
