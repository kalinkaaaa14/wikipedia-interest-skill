import type { DailySeries } from '../../types/daily-series.ts';
import type { PageviewsResponse } from '../../types/pageviews-response.ts';
import { apiFirstDay } from '../dates/api-first-day.ts';
import { apiLastDay } from '../dates/api-last-day.ts';
import { getJson } from '../http/get-json.ts';
import { cacheTtlForMonth } from './cache-ttl-for-month.ts';
import { PAGEVIEWS_BASE_URL } from './pageviews-base-url.ts';
import { toDailySeries } from './to-daily-series.ts';

/** Daily human views of the whole language edition: the denominator for normalization. */
export async function fetchProjectDaily(lang: string, startMonth: string, endMonth: string): Promise<DailySeries> {
  const url =
    `${PAGEVIEWS_BASE_URL}/aggregate/${lang}.wikipedia/all-access/user/daily/` +
    `${apiFirstDay(startMonth)}00/${apiLastDay(endMonth)}00`;
  const body = await getJson<PageviewsResponse>(url, { ttlSeconds: cacheTtlForMonth(endMonth) });

  if (!body) {
    throw new Error(`No aggregate data for ${lang}.wikipedia — is "${lang}" a valid language code?`);
  }

  return toDailySeries(body.items);
}
