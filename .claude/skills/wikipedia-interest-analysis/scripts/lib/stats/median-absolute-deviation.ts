import { median } from './median.ts';

/** Median absolute deviation, scaled to be comparable with a standard deviation for normal data. */
export function medianAbsoluteDeviation(values: number[]): number {
  const center = median(values);

  return 1.4826 * median(values.map((value) => Math.abs(value - center)));
}
