import type { ArticleSearchHit } from './article-search-hit.ts';

export type ArticleSearchResponse = {
  query: {
    search: ArticleSearchHit[];
  };
};
