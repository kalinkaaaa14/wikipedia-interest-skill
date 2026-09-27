import type { DailySeries } from '../../types/daily-series.ts';

const WEEKDAY = 0;
const WEEKEND = 1;

/**
 * How much more the article is read on weekdays than on weekends, divided by the same ratio for the
 * whole edition (Wikipedia overall has its own weekly rhythm). 1 = the same rhythm as the edition,
 * >1 = relatively more weekday reading. null when there are too few weekend days to tell.
 */
export function weekdayRatio(days: string[], articleViews: number[], editionDaily: DailySeries): number | null {
  const articleTotals = [0, 0];
  const editionTotals = [0, 0];
  const dayCounts = [0, 0];

  days.forEach((day, index) => {
    // getUTCDay(): Sunday = 0, Saturday = 6.
    const bucket = new Date(`${day}T00:00:00Z`).getUTCDay() % 6 === 0 ? WEEKEND : WEEKDAY;
    articleTotals[bucket] += articleViews[index];
    editionTotals[bucket] += editionDaily.get(day) ?? 0;
    dayCounts[bucket]++;
  });

  if (dayCounts[WEEKEND] < 8 || articleTotals[WEEKEND] === 0 || editionTotals[WEEKEND] === 0) {
    return null;
  }

  return articleTotals[WEEKDAY] / articleTotals[WEEKEND] / (editionTotals[WEEKDAY] / editionTotals[WEEKEND]);
}
