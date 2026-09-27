import type { DespikeResult } from '../../types/despike-result.ts';
import { median } from '../stats/median.ts';
import { medianAbsoluteDeviation } from '../stats/median-absolute-deviation.ts';

/**
 * Detect spikes against a *local* ±28-day median so a steadily growing series is not
 * mistaken for a spike. Returns the robust daily values (spikes replaced by the local median).
 */
export function despike(values: number[], windowDays = 28, madMultiplier = 5, minRatio = 3): DespikeResult {
  const robustValues = [...values];
  const spikeIndexes: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const neighbourhood = values.slice(Math.max(0, i - windowDays), Math.min(values.length, i + windowDays + 1));
    const localMedian = median(neighbourhood);
    const threshold = Math.max(localMedian + madMultiplier * medianAbsoluteDeviation(neighbourhood), localMedian * minRatio, 10);

    if (values[i] > threshold) {
      spikeIndexes.push(i);
      robustValues[i] = localMedian;
    }
  }

  return { robustValues, spikeIndexes };
}
