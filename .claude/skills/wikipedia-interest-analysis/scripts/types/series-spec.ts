import type { BasketMember } from './basket-member.ts';

export type SeriesSpec = {
  lang: string;
  /** null = the topic has no article in this language edition (a content gap, not an error). */
  title: string | null;
  topic: string;
  qid?: string;
  /** Broad topic measured as the sum of several articles, all present in every language of the run. `title` is null then. */
  basket?: BasketMember[];
  /** Subtopics left out of the basket and why (reported to the user as content gaps). */
  basketExcluded?: string[];
};
