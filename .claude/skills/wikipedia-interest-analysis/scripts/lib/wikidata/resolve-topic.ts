import type { Candidate } from '../../types/candidate.ts';
import type { WikidataSearchResponse } from '../../types/wikidata-search-response.ts';
import { getJson } from '../http/get-json.ts';
import { getEntities } from './get-entities.ts';
import { ONE_WEEK_SECONDS } from './one-week-seconds.ts';
import { toCandidate } from './to-candidate.ts';
import { WIKIDATA_API_URL } from './wikidata-api-url.ts';

/**
 * Turn a free-text topic into Wikidata entities and their article titles per language.
 * Cross-language comparison must go through Wikidata: article titles differ per edition.
 */
export async function resolveTopic(topic: string, langs: string[], searchLang: string, limit = 15): Promise<Candidate[]> {
  const url =
    `${WIKIDATA_API_URL}?action=wbsearchentities&format=json&type=item&limit=${limit}` +
    `&language=${searchLang}&uselang=${searchLang}&search=${encodeURIComponent(topic)}`;
  const body = await getJson<WikidataSearchResponse>(url, { ttlSeconds: ONE_WEEK_SECONDS });
  const ids = body?.search.map((hit) => hit.id) ?? [];

  if (ids.length === 0) {
    return [];
  }

  const entities = await getEntities(ids, searchLang);
  const candidates = ids.filter((id) => entities[id]).map((id) => toCandidate(id, entities[id], langs, searchLang));
  // Items with no Wikipedia article anywhere (papers, clinical trials…) are noise for this skill.
  const withArticles = candidates.filter((candidate) => candidate.wikipediaEditions > 0);

  return withArticles.length ? withArticles : candidates;
}
