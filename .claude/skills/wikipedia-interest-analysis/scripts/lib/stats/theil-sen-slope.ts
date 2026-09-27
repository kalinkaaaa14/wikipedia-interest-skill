import { median } from './median.ts';

/** Theil–Sen estimator: the median of pairwise slopes. Robust to outliers (up to ~29% of points). Slope is per index step. */
export function theilSenSlope(values: number[]): number {
  const slopes: number[] = [];

  for (let i = 0; i < values.length; i++) {
    for (let laterIndex = i + 1; laterIndex < values.length; laterIndex++) {
      slopes.push((values[laterIndex] - values[i]) / (laterIndex - i));
    }
  }

  return median(slopes);
}
