import type { Candidate } from '../../types/candidate.ts';
import type { LocalizedValue } from '../../types/localized-value.ts';
import type { WikidataEntity } from '../../types/wikidata-entity.ts';

// "commonswiki", "specieswiki" etc. are sitelinks, but not Wikipedia editions.
const NON_WIKIPEDIA_SITES = /^(commons|species|meta|mediawiki|wikidata|sources|outreach|incubator|wikimania|wikifunctions)wiki$/;

export function toCandidate(qid: string, entity: WikidataEntity, langs: string[], uiLang: string): Candidate {
  const sitelinks = entity.sitelinks ?? {};
  const articles: Record<string, string | null> = {};

  for (const lang of langs) {
    articles[lang] = sitelinks[`${lang.replace(/-/g, '_')}wiki`]?.title ?? null;
  }

  const pickLocalized = (values?: Record<string, LocalizedValue>) => values?.[uiLang]?.value ?? values?.en?.value ?? '';

  return {
    qid,
    label: pickLocalized(entity.labels),
    description: pickLocalized(entity.descriptions),
    articles,
    wikipediaEditions: Object.keys(sitelinks).filter((site) => /^[a-z_]+wiki$/.test(site) && !NON_WIKIPEDIA_SITES.test(site)).length,
  };
}
