import type { BasketCandidate } from '../../types/basket-candidate.ts';
import type { TopicNotFound } from '../../types/topic-not-found.ts';
import { mapLimit } from '../http/map-limit.ts';
import { comparableCandidates } from './comparable-candidates.ts';
import { pickMostCovered } from './pick-most-covered.ts';
import { resolveTopic } from './resolve-topic.ts';

/** Resolve several subtopic names at once: the best Wikidata match for each, with article coverage per language. */
export async function resolveTopics(names: string[], langs: string[], searchLang: string): Promise<(BasketCandidate | TopicNotFound)[]> {
  return mapLimit(names, 3, async (name): Promise<BasketCandidate | TopicNotFound> => {
    const candidates = await resolveTopic(name, langs, searchLang, 5);

    if (!candidates.length) {
      return { name, notFound: true };
    }

    const best = pickMostCovered(candidates);
    const comparable = comparableCandidates(candidates);
    const alternatives = candidates
      .filter((candidate) => candidate.qid !== best.qid && comparable.includes(candidate.qid))
      .map(({ qid, label, description }) => ({ qid, label, description }));

    return {
      ...best,
      name,
      inAllLangs: langs.every((lang) => best.articles[lang]),
      ...(comparable.length >= 2 ? { alternatives } : {}),
    };
  });
}
