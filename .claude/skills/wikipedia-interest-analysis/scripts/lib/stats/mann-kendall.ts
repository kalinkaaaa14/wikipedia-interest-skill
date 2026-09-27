import type { MannKendallResult } from '../../types/mann-kendall-result.ts';
import { normalCdf } from './normal-cdf.ts';

/** Z with the continuity correction: the statistic moves one step towards zero. */
function continuityCorrectedZ(statistic: number, variance: number): number {
  if (statistic > 0) {
    return (statistic - 1) / Math.sqrt(variance);
  }

  if (statistic < 0) {
    return (statistic + 1) / Math.sqrt(variance);
  }

  return 0;
}

/**
 * Mann–Kendall trend test (two-sided). Non-parametric: asks "do later values tend to be larger?"
 * without assuming linearity or normality. Returns the statistic, Z and the p-value (tie-corrected variance).
 */
export function mannKendall(values: number[]): MannKendallResult {
  const count = values.length;
  let statistic = 0;

  for (let i = 0; i < count; i++) {
    for (let laterIndex = i + 1; laterIndex < count; laterIndex++) {
      statistic += Math.sign(values[laterIndex] - values[i]);
    }
  }

  const tieCounts = new Map<number, number>();

  for (const value of values) {
    tieCounts.set(value, (tieCounts.get(value) ?? 0) + 1);
  }

  let tieTerm = 0;

  for (const tieSize of tieCounts.values()) {
    if (tieSize > 1) {
      tieTerm += tieSize * (tieSize - 1) * (2 * tieSize + 5);
    }
  }

  const variance = (count * (count - 1) * (2 * count + 5) - tieTerm) / 18;

  if (variance <= 0) {
    return { statistic, zScore: 0, pValue: 1 };
  }

  const zScore = continuityCorrectedZ(statistic, variance);

  return { statistic, zScore, pValue: 2 * (1 - normalCdf(Math.abs(zScore))) };
}
