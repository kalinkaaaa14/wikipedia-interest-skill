import type { Direction } from '../../types/direction.ts';

/**
 * growth = robust share YoY % (or the trend when there is no YoY). See references/METHODOLOGY.md → Direction.
 * A borderline YoY (5–10%) backed by a strong (≥10%/yr), significant trend the same way is a real move, not "flat".
 */
export function classifyDirection(growth: number | null, trendPctPerYear: number | null, trendP: number | null): Direction {
  if (growth === null) {
    return 'unclear';
  }

  const trendAgrees = trendPctPerYear !== null && trendP !== null && trendP < 0.1 && Math.sign(trendPctPerYear) === Math.sign(growth);
  const borderlineWithTrend = Math.abs(growth) >= 5 && trendAgrees && Math.abs(trendPctPerYear!) >= 10;

  if (Math.abs(growth) < 10 && !borderlineWithTrend) {
    return 'flat';
  }

  if (trendAgrees) {
    return growth > 0 ? 'growing' : 'declining';
  }

  return 'unclear';
}
