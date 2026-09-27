import { comparableCandidates } from '../lib/wikidata/comparable-candidates.ts';
import { fetchInstanceOf } from '../lib/wikidata/fetch-instance-of.ts';
import { hasFieldClass } from '../lib/wikidata/has-field-class.ts';
import { pickMostCovered } from '../lib/wikidata/pick-most-covered.ts';
import { resolveQids } from '../lib/wikidata/resolve-qids.ts';
import { resolveTopic } from '../lib/wikidata/resolve-topic.ts';
import { resolveTopics } from '../lib/wikidata/resolve-topics.ts';
import type { BasketCandidate } from '../types/basket-candidate.ts';
import type { Candidate } from '../types/candidate.ts';
import type { CliValues } from '../types/cli-values.ts';
import { MAX_BASKET_SIZE } from './max-basket-size.ts';
import { printJson } from './print-json.ts';
import { splitCsv } from './split-csv.ts';
import { UsageError } from './usage-error.ts';

function missingLangs(candidate: Candidate, langs: string[]): string {
  return langs.filter((lang) => !candidate.articles[lang]).join(', ');
}

async function printBasketCandidates(topics: string, langs: string[], searchLang: string): Promise<void> {
  const names = topics.split('|').map((name) => name.trim()).filter(Boolean);

  if (names.length > MAX_BASKET_SIZE) {
    throw new UsageError(`At most ${MAX_BASKET_SIZE} subtopics per basket.`);
  }

  const found = await resolveTopics(names, langs, searchLang);
  const resolved = found.filter((item): item is BasketCandidate => !('notFound' in item));
  const usable = resolved.filter((candidate) => candidate.inAllLangs && !candidate.alternatives);

  printJson({
    basket: found,
    usable: usable.length,
    excluded: resolved.filter((candidate) => !candidate.inAllLangs).map((candidate) => `${candidate.label}: no ${missingLangs(candidate, langs)} article`),
    ambiguous: resolved
      .filter((candidate) => candidate.alternatives)
      .map((candidate) => `${candidate.name}: pick one of ${[candidate, ...candidate.alternatives!].map((option) => `${option.qid} (${option.description})`).join(', ')}`),
    hint:
      'STOP after this step: show the user the subtopics (and `excluded`, `ambiguous`) and ask them to confirm, remove or add. ' +
      'Do NOT run analyze in this turn. Names in `ambiguous` are not in the command: pick the QID that fits the field and add it. ' +
      `After the user confirms: analyze --basket "<topic>=${usable.map((candidate) => candidate.qid).join(',')}" --langs ${langs.join(',')}`,
  });
}

async function findCandidates(values: CliValues, langs: string[], searchLang: string): Promise<Candidate[]> {
  if (values.qids) {
    return resolveQids(splitCsv(values.qids as string), langs, searchLang);
  }

  if (values.topic) {
    return resolveTopic(values.topic as string, langs, searchLang);
  }

  throw new UsageError('Pass --topic "..." or --qids Q123');
}

export async function runResolveCommand(values: CliValues): Promise<void> {
  const langs = splitCsv(values.langs as string);
  const searchLang = (values['search-lang'] as string) ?? 'en';

  if (!langs.length) {
    throw new UsageError('--langs is required, e.g. --langs pl,cs');
  }

  if (values.topics) {
    await printBasketCandidates(values.topics as string, langs, searchLang);

    return;
  }

  const candidates = await findCandidates(values, langs, searchLang);

  if (candidates.length === 0) {
    printJson({ candidates: [], hint: 'No Wikidata match. Try the English name with --search-lang en, a synonym, or the language of the query (e.g. --search-lang uk).' });

    return;
  }

  // Only for free-text search: with --qids the item is already chosen.
  const comparable = values.topic ? comparableCandidates(candidates) : [];

  if (comparable.length >= 2) {
    printJson({
      candidates,
      ambiguous: true,
      comparable,
      hint:
        'AMBIGUOUS: several different topics with comparable Wikipedia coverage match this word. ' +
        "Unless the user's own words already pick one meaning, do NOT run analyze: list the plausible meanings with QIDs and ask which one.",
    });

    return;
  }

  const top = pickMostCovered(candidates);

  if (hasFieldClass(await fetchInstanceOf(top.qid))) {
    printJson({
      candidates,
      broad_field: top.qid,
      hint:
        `FIELD OF KNOWLEDGE: ${top.qid} (${top.label}) is an academic field. One article is a small, untypical part of the interest in a field: ` +
        'unless the user asked about this one article, run resolve --topics with 10–20 subtopics right away (in this turn), then ask the user once to confirm the list before analyze --basket.',
    });

    return;
  }

  printJson({
    candidates,
    hint: 'Pick the candidate that matches the user intent (check label/description). If more than one is plausible, ask the user. Then: analyze --qids <qid> --langs ...',
  });
}
