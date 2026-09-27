import type { WikidataEntitiesResponse } from '../../types/wikidata-entities-response.ts';
import type { WikidataEntity } from '../../types/wikidata-entity.ts';
import { getJson } from '../http/get-json.ts';
import { ONE_WEEK_SECONDS } from './one-week-seconds.ts';
import { WIKIDATA_API_URL } from './wikidata-api-url.ts';

export async function getEntities(ids: string[], uiLang: string): Promise<Record<string, WikidataEntity>> {
  const url =
    `${WIKIDATA_API_URL}?action=wbgetentities&format=json&props=labels|descriptions|sitelinks` +
    `&languages=${uiLang}|en&ids=${ids.join('|')}`;
  const body = await getJson<WikidataEntitiesResponse>(url, { ttlSeconds: ONE_WEEK_SECONDS });

  return body?.entities ?? {};
}
