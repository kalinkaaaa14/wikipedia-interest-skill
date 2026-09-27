import type { DailySeries } from '../../types/daily-series.ts';
import type { PageviewsResponse } from '../../types/pageviews-response.ts';
import { apiFirstDay } from '../dates/api-first-day.ts';
import { apiLastDay } from '../dates/api-last-day.ts';
import { getJson } from '../http/get-json.ts';
import { cacheTtlForMonth } from './cache-ttl-for-month.ts';
import { PAGEVIEWS_BASE_URL } from './pageviews-base-url.ts';
import { toDailySeries } from './to-daily-series.ts';

function articleUrlTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, '_'));
}

/** Daily human (agent=user) views of one article. Returns null if the article has no pageview data at all. */
export async function fetchArticleDaily(lang: string, title: string, startMonth: string, endMonth: string): Promise<DailySeries | null> {
  const url =
    `${PAGEVIEWS_BASE_URL}/per-article/${lang}.wikipedia/all-access/user/${articleUrlTitle(title)}` +
    `/daily/${apiFirstDay(startMonth)}/${apiLastDay(endMonth)}`;
  const body = await getJson<PageviewsResponse>(url, { ttlSeconds: cacheTtlForMonth(endMonth) });

  if (!body) {
    return null;
  }

  return toDailySeries(body.items);
}
