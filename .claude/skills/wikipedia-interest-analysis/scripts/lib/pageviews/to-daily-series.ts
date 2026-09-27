import type { DailySeries } from '../../types/daily-series.ts';
import type { PageviewsItem } from '../../types/pageviews-item.ts';
import { apiTimestampToDate } from '../dates/api-timestamp-to-date.ts';

export function toDailySeries(items: PageviewsItem[]): DailySeries {
  return new Map(items.map((item) => [apiTimestampToDate(item.timestamp), item.views]));
}
