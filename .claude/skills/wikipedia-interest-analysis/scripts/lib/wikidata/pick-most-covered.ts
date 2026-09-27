import type { Candidate } from '../../types/candidate.ts';

/** Search ranks by name match, so an exact-title book beats the concept ("Big Bang"). Prefer the most-covered item. */
export function pickMostCovered<Item extends Candidate>(candidates: Item[]): Item {
  return candidates.reduce((best, candidate) => (candidate.wikipediaEditions > best.wikipediaEditions ? candidate : best));
}
