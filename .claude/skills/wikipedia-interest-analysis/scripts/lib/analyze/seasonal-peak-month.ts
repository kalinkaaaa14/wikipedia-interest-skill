import type { MonthValue } from '../../types/month-value.ts';
import { sum } from '../stats/sum.ts';

function mean(values: number[]): number {
  return sum(values) / values.length;
}

/**
 * Strong seasonality: the monthly pattern of the last 12 months correlates with the previous 12
 * and the peak month is ≥2× the trough. Returns the peak calendar month ('09' etc.) or null.
 */
export function seasonalPeakMonth(points: MonthValue[]): string | null {
  if (points.length < 24) {
    return null;
  }

  const previousYear = points.slice(-24, -12).map((point) => point.value);
  const lastYear = points.slice(-12).map((point) => point.value);
  const previousMean = mean(previousYear);
  const lastMean = mean(lastYear);
  const covariance = sum(previousYear.map((value, index) => (value - previousMean) * (lastYear[index] - lastMean)));
  const correlation = covariance / Math.sqrt(sum(previousYear.map((value) => (value - previousMean) ** 2)) * sum(lastYear.map((value) => (value - lastMean) ** 2)));
  const relativeLevel = previousYear.map((value, index) => value / previousMean + lastYear[index] / lastMean);
  const peakIndex = relativeLevel.indexOf(Math.max(...relativeLevel));
  const trough = Math.min(...relativeLevel);

  if (!(correlation > 0.6) || trough <= 0 || relativeLevel[peakIndex] / trough < 2) {
    return null;
  }

  return points[points.length - 12 + peakIndex].month.slice(5);
}
