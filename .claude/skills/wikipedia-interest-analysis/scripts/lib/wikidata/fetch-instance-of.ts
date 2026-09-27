import type { WikidataClaimsResponse } from '../../types/wikidata-claims-response.ts';
import { getJson } from '../http/get-json.ts';
import { ONE_WEEK_SECONDS } from './one-week-seconds.ts';
import { WIKIDATA_API_URL } from './wikidata-api-url.ts';

/** The classes an item is an instance of (P31). One small request, unlike loading all of the item's claims. */
export async function fetchInstanceOf(qid: string): Promise<string[]> {
  const url = `${WIKIDATA_API_URL}?action=wbgetclaims&format=json&property=P31&entity=${qid}`;
  const body = await getJson<WikidataClaimsResponse>(url, { ttlSeconds: ONE_WEEK_SECONDS });

  return (body?.claims?.P31 ?? []).flatMap((claim) => {
    const classId = claim.mainsnak.datavalue?.value?.id;

    return classId ? [classId] : [];
  });
}
