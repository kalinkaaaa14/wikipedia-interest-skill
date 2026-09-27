import { readFile } from 'node:fs/promises';
import { defaultEnd } from '../lib/analyze/default-end.ts';
import { resolveQids } from '../lib/wikidata/resolve-qids.ts';
import type { AnalysisSpec } from '../types/analysis-spec.ts';
import type { CliValues } from '../types/cli-values.ts';
import type { RankingWeights } from '../types/ranking-weights.ts';
import type { SeriesSpec } from '../types/series-spec.ts';
import { parseBasket } from './parse-basket.ts';
import { splitCsv } from './split-csv.ts';
import { UsageError } from './usage-error.ts';

const DEFAULT_WEIGHTS: RankingWeights = { growth: 0.6, size: 0.4 };

function requireLangs(values: CliValues, option: string): string[] {
  const langs = splitCsv(values.langs as string);

  if (!langs.length) {
    throw new UsageError(`${option} needs --langs, e.g. --langs pl,cs`);
  }

  return langs;
}

async function basketSeries(values: CliValues): Promise<SeriesSpec[]> {
  if (values.qids || values.articles) {
    throw new UsageError('--basket cannot be combined with --qids or --articles; put single topics in their own basket or run them separately.');
  }

  const langs = requireLangs(values, '--basket');
  const series: SeriesSpec[] = [];

  for (const basket of parseBasket(values.basket as string)) {
    const items = await resolveQids(basket.qids, langs);
    const common = items.filter((item) => langs.every((lang) => item.articles[lang]));
    const excluded = items
      .filter((item) => !common.includes(item))
      .map((item) => `${item.label}: no ${langs.filter((lang) => !item.articles[lang]).join(', ')} article`);

    if (common.length < 3) {
      throw new UsageError(`Basket "${basket.name}" has only ${common.length} subtopics with an article in every language (${langs.join(', ')}). Add subtopics, or drop the language with the gaps.`);
    }

    for (const lang of langs) {
      series.push({ lang, title: null, topic: basket.name, basket: common.map((item) => ({ qid: item.qid, label: item.label, title: item.articles[lang]! })), basketExcluded: excluded });
    }
  }

  return series;
}

async function qidSeries(values: CliValues): Promise<SeriesSpec[]> {
  const langs = requireLangs(values, '--qids');
  const items = await resolveQids(splitCsv(values.qids as string), langs);

  return items.flatMap((item) => langs.map((lang): SeriesSpec => ({ lang, title: item.articles[lang], topic: item.label || item.qid, qid: item.qid })));
}

function articleSeries(articles: string): SeriesSpec[] {
  return articles.split('|').map((pair) => {
    const [lang, ...rest] = pair.split('=');
    const title = rest.join('=').trim();

    if (!lang || !title) {
      throw new UsageError(`Bad --articles entry "${pair}". Expected lang=Title, separated by |`);
    }

    return { lang: lang.trim(), title, topic: title };
  });
}

function parseWeights(weights: string): RankingWeights {
  const parsed = Object.fromEntries(splitCsv(weights).map((pair) => pair.split('=')).map(([key, value]) => [key.trim(), Number(value)]));

  return { growth: parsed.growth ?? DEFAULT_WEIGHTS.growth, size: parsed.size ?? DEFAULT_WEIGHTS.size };
}

/** The analysis spec from the command line, optionally on top of a saved spec.json. */
export async function buildSpec(values: CliValues): Promise<AnalysisSpec> {
  const spec: Partial<AnalysisSpec> = values.spec ? JSON.parse(await readFile(values.spec as string, 'utf8')) : {};

  if (values.basket) {
    spec.series = await basketSeries(values);
  } else if (values.qids) {
    spec.series = await qidSeries(values);
  } else if (values.articles) {
    spec.series = articleSeries(values.articles as string);
  }

  if (!spec.series?.length) {
    throw new UsageError('Nothing to analyze: pass --qids + --langs, --articles, or --spec.');
  }

  if (values.months) {
    spec.months = Number(values.months);
  }

  if (values.end) {
    spec.end = values.end as string;
  }

  if (values.weights) {
    spec.weights = parseWeights(values.weights as string);
  }

  spec.months ??= 24;
  spec.end ??= defaultEnd();
  spec.weights ??= { ...DEFAULT_WEIGHTS };

  if (!(spec.months >= 12 && spec.months <= 120)) {
    throw new UsageError('--months must be between 12 and 120');
  }

  if (!/^\d{4}-\d{2}$/.test(spec.end)) {
    throw new UsageError('--end must look like 2026-08');
  }

  if (spec.end > defaultEnd()) {
    throw new UsageError(`--end must be a complete month (latest: ${defaultEnd()})`);
  }

  return spec as AnalysisSpec;
}
