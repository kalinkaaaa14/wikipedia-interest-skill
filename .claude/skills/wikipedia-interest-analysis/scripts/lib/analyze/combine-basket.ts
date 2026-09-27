import type { BasketMemberDaily } from '../../types/basket-member-daily.ts';
import type { CombinedBasket } from '../../types/combined-basket.ts';
import type { DailySeries } from '../../types/daily-series.ts';

/**
 * Sum the daily views of basket members into one series. A member whose data starts more than a week
 * after the period start (created or renamed during it) is left out: its arrival would look like growth.
 */
export function combineBasket(members: BasketMemberDaily[], periodStart: string): CombinedBasket {
  const latestFirstDay = `${periodStart}-08`;
  const daily: DailySeries = new Map();
  const usedIndexes: number[] = [];
  const excluded: string[] = [];

  members.forEach((member, index) => {
    if (!member.daily?.size) {
      excluded.push(`${member.label}: no pageview data`);

      return;
    }

    const firstDay = [...member.daily.keys()].sort()[0];

    if (firstDay > latestFirstDay) {
      excluded.push(`${member.label}: data only since ${firstDay.slice(0, 7)}`);

      return;
    }

    usedIndexes.push(index);

    for (const [day, views] of member.daily) {
      daily.set(day, (daily.get(day) ?? 0) + views);
    }
  });

  return { daily, usedIndexes, excluded };
}
