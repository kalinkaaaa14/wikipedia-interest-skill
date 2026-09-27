import type { LevelShift } from '../../types/level-shift.ts';
import { median } from '../stats/median.ts';

function shiftStrength(shift: LevelShift): number {
  return Math.abs(Math.log(shift.ratio));
}

/**
 * Abrupt level shift: the split point (≥3 months each side) with the largest ratio between the
 * median before and after. A sudden ×3 jump or drop often means a rename, redirect change, or
 * external traffic change (search engine, app link) rather than gradual change in interest.
 */
export function detectLevelShift(monthlyValues: number[], minSide = 3): LevelShift | null {
  const candidates: LevelShift[] = [];

  for (let i = minSide; i <= monthlyValues.length - minSide; i++) {
    const before = median(monthlyValues.slice(Math.max(0, i - 6), i));
    const after = median(monthlyValues.slice(i, i + 6));

    if (before > 0 && after > 0) {
      candidates.push({ index: i, ratio: after / before });
    }
  }

  // A jump that repeats 12 months earlier or later is seasonality (school subjects drop every summer), not a shift.
  const byIndex = new Map(candidates.map((shift) => [shift.index, shift]));
  const isSeasonal = (shift: LevelShift) =>
    [shift.index - 12, shift.index + 12].some((otherIndex) => {
      const other = byIndex.get(otherIndex);

      return other !== undefined && Math.sign(Math.log(other.ratio)) === Math.sign(Math.log(shift.ratio)) && shiftStrength(other) >= 0.5 * shiftStrength(shift);
    });
  const realShifts = candidates.filter((shift) => !isSeasonal(shift));

  if (!realShifts.length) {
    return null;
  }

  const maxStrength = Math.max(...realShifts.map(shiftStrength));
  // Neighbouring split points of a clean step tie; the middle one is the actual break.
  const tied = realShifts.filter((shift) => maxStrength - shiftStrength(shift) < 1e-9);
  const best = tied[Math.floor((tied.length - 1) / 2)];

  return best.ratio >= 2.5 || best.ratio <= 0.4 ? best : null;
}
