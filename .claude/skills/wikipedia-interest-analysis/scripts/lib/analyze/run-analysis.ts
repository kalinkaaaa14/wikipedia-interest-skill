import type { AnalysisResult } from '../../types/analysis-result.ts';
import type { AnalysisSpec } from '../../types/analysis-spec.ts';
import type { BasketMember } from '../../types/basket-member.ts';
import type { DailySeries } from '../../types/daily-series.ts';
import type { MonthSpan } from '../../types/month-span.ts';
import type { SeriesResult } from '../../types/series-result.ts';
import type { SeriesSpec } from '../../types/series-spec.ts';
import { addMonths } from '../dates/add-months.ts';
import { EARLIEST_MONTH } from '../dates/earliest-month.ts';
import { monthRange } from '../dates/month-range.ts';
import { mapLimit } from '../http/map-limit.ts';
import { fetchArticleDaily } from '../pageviews/fetch-article-daily.ts';
import { fetchProjectDaily } from '../pageviews/fetch-project-daily.ts';
import { addCrossLanguageSignals } from './add-cross-language-signals.ts';
import { analyzeSeries } from './analyze-series.ts';
import { buildFindings } from './build-findings.ts';
import { combineBasket } from './combine-basket.ts';
import { rankSeries } from './rank-series.ts';

function periodFor(spec: AnalysisSpec): MonthSpan {
  const requestedStart = addMonths(spec.end, -(spec.months - 1));

  return { start: requestedStart < EARLIEST_MONTH ? EARLIEST_MONTH : requestedStart, end: spec.end };
}

function daysInRange(startMonth: string, endMonth: string): string[] {
  const days: string[] = [];
  const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  const stop = new Date(Date.UTC(endYear, endMonthNumber, 1));

  for (const day = new Date(Date.UTC(startYear, startMonthNumber - 1, 1)); day < stop; day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }

  return days;
}

function analyzeBasket(
  spec: SeriesSpec,
  members: BasketMember[],
  memberDailies: (DailySeries | null)[],
  editionDaily: DailySeries,
  months: string[],
  days: string[],
  periodStart: string,
): SeriesResult {
  const combined = combineBasket(members.map((member, index) => ({ label: member.label, daily: memberDailies[index] })), periodStart);
  const kept = combined.usedIndexes.map((index) => members[index]);
  const keptDailies = combined.usedIndexes.map((index) => memberDailies[index]);
  const excluded = [...(spec.basketExcluded ?? []), ...combined.excluded];

  if (kept.length < 3) {
    const empty = analyzeSeries({ ...spec, basket: kept }, null, editionDaily, months, days);

    return { ...empty, notes: ['Fewer than 3 basket articles have data for the whole period.'], basket: { members: [], excluded } };
  }

  const result = analyzeSeries({ ...spec, basket: kept }, combined.daily, editionDaily, months, days);
  const breakdown = kept
    .map((member, index) => {
      const memberResult = analyzeSeries({ lang: spec.lang, title: member.title, topic: member.label, qid: member.qid }, keptDailies[index], editionDaily, months, days);

      return {
        qid: member.qid,
        label: member.title,
        shareOfBasketPct: Math.round(((memberResult.metrics?.avgMonthlyViews ?? 0) / (result.metrics?.avgMonthlyViews || 1)) * 100),
        yoyShareRobustPct: memberResult.metrics?.yoyShareRobustPct ?? null,
        direction: memberResult.direction,
      };
    })
    .sort((left, right) => right.shareOfBasketPct - left.shareOfBasketPct);

  return { ...result, basket: { members: breakdown, excluded } };
}

export async function runAnalysis(spec: AnalysisSpec): Promise<AnalysisResult> {
  const { start, end } = periodFor(spec);
  const months = monthRange(start, end);
  const days = daysInRange(start, end);
  const langs = [...new Set(spec.series.map((item) => item.lang))];
  const editions = new Map(await mapLimit(langs, 3, async (lang) => [lang, await fetchProjectDaily(lang, start, end)] as const));
  const dailies = await mapLimit(spec.series, 3, (item) => (item.title && !item.basket ? fetchArticleDaily(item.lang, item.title, start, end) : Promise.resolve(null)));
  // Basket members: one request per member and language, all in one queue.
  const memberJobs = spec.series.flatMap((item, seriesIndex) => (item.basket ?? []).map((member) => ({ seriesIndex, member, lang: item.lang })));
  const memberDailies = await mapLimit(memberJobs, 3, (job) => fetchArticleDaily(job.lang, job.member.title, start, end));
  const series = spec.series.map((item, seriesIndex) => {
    const editionDaily = editions.get(item.lang)!;

    if (!item.basket) {
      return analyzeSeries(item, dailies[seriesIndex], editionDaily, months, days);
    }

    const jobIndexes = memberJobs.flatMap((job, jobIndex) => (job.seriesIndex === seriesIndex ? [jobIndex] : []));

    return analyzeBasket(
      item,
      jobIndexes.map((jobIndex) => memberJobs[jobIndex].member),
      jobIndexes.map((jobIndex) => memberDailies[jobIndex]),
      editionDaily,
      months,
      days,
      start,
    );
  });

  addCrossLanguageSignals(series);
  const ranking = rankSeries(series, spec.weights);

  return {
    spec,
    period: { start, end, months: months.length },
    series,
    ranking,
    findings: buildFindings(series, ranking, spec.weights),
    generatedAt: new Date().toISOString(),
  };
}
