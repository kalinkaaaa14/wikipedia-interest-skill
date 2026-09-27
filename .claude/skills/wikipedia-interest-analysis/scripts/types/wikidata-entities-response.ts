import type { WikidataEntity } from './wikidata-entity.ts';

export type WikidataEntitiesResponse = {
  entities: Record<string, WikidataEntity>;
};
