import type { LocalizedValue } from './localized-value.ts';
import type { Sitelink } from './sitelink.ts';

export type WikidataEntity = {
  labels?: Record<string, LocalizedValue>;
  descriptions?: Record<string, LocalizedValue>;
  sitelinks?: Record<string, Sitelink>;
};
