import type { WikidataSearchHit } from './wikidata-search-hit.ts';

export type WikidataSearchResponse = {
  search: WikidataSearchHit[];
};
