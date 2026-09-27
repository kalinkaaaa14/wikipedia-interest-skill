import type { ArticleSearchHit } from '../../types/article-search-hit.ts';
import type { ArticleSearchResponse } from '../../types/article-search-response.ts';
import { getJson } from '../http/get-json.ts';
import { ONE_WEEK_SECONDS } from './one-week-seconds.ts';

/** Full-text search inside one language edition: the fallback when Wikidata has no sitelink for that language. */
export async function searchArticles(lang: string, query: string, limit = 5): Promise<ArticleSearchHit[]> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srnamespace=0` +
    `&srlimit=${limit}&srsearch=${encodeURIComponent(query)}`;
  const body = await getJson<ArticleSearchResponse>(url, { ttlSeconds: ONE_WEEK_SECONDS });

  return (body?.query.search ?? []).map((hit) => ({ title: hit.title, snippet: hit.snippet.replace(/<[^>]+>/g, '').slice(0, 140) }));
}
