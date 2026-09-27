import type { Candidate } from '../../types/candidate.ts';
import { getEntities } from './get-entities.ts';
import { toCandidate } from './to-candidate.ts';

export async function resolveQids(qids: string[], langs: string[], uiLang = 'en'): Promise<Candidate[]> {
  const entities = await getEntities(qids, uiLang);

  return qids.map((id) => {
    if (!entities[id] || !('sitelinks' in entities[id])) {
      throw new Error(`Wikidata item ${id} not found`);
    }

    return toCandidate(id, entities[id], langs, uiLang);
  });
}
