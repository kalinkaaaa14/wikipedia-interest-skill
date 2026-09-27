import type { Candidate } from '../../types/candidate.ts';

/**
 * QIDs of candidates whose Wikipedia coverage is comparable to the top one (≥ ratio × max editions).
 * Two or more results → the search word names several major, different topics (Mercury: planet + element).
 */
export function comparableCandidates(candidates: Candidate[], ratio = 0.5): string[] {
  const maxEditions = Math.max(0, ...candidates.map((candidate) => candidate.wikipediaEditions));

  if (maxEditions === 0) {
    return [];
  }

  return candidates
    .filter((candidate) => candidate.wikipediaEditions >= maxEditions * ratio)
    .map((candidate) => candidate.qid);
}
