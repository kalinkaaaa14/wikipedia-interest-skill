import type { WikidataClaim } from './wikidata-claim.ts';

export type WikidataClaimsResponse = {
  claims?: Record<string, WikidataClaim[]>;
};
