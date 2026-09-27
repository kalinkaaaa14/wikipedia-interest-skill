import { searchArticles } from '../lib/wikidata/search-articles.ts';
import type { CliValues } from '../types/cli-values.ts';
import { printJson } from './print-json.ts';
import { UsageError } from './usage-error.ts';

export async function runSearchCommand(values: CliValues): Promise<void> {
  if (!values.lang || !values.query) {
    throw new UsageError('search needs --lang pl --query "..."');
  }

  const results = await searchArticles(values.lang as string, values.query as string);

  printJson({
    results,
    hint: 'These are full-text matches, not translations. Only use one if it is clearly about the topic; tell the user it is a proxy (broader/related article). Then: analyze --articles "lang=Title|..."',
  });
}
