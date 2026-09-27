import type { SeriesResult } from '../../types/series-result.ts';

const MS_PER_DAY = 86_400_000;

function daysBetween(first: string, second: string): number {
  return Math.abs(Date.parse(first) - Date.parse(second)) / MS_PER_DAY;
}

function addSignalsFromOtherEditions(series: SeriesResult, others: SeriesResult[]): void {
  if (!others.length) {
    return;
  }

  const topSpike = series.metrics!.topSpikes[0];
  // Only editions whose article already existed on that day can confirm or refute the spike.
  const covering = topSpike ? others.filter((other) => other.metrics!.firstDataMonth <= topSpike.date.slice(0, 7)) : [];

  if (topSpike && covering.length) {
    const shared = covering.filter((other) => other.metrics!.spikeDates.some((day) => daysBetween(day, topSpike.date) <= 2)).map((other) => other.lang);
    series.signals.push(shared.length
      ? `Biggest spike (${topSpike.date}) also appears in ${shared.join(', ')} within ±2 days: shared across editions.`
      : `Biggest spike (${topSpike.date}) does not appear in ${covering.map((other) => other.lang).join(', ')}: specific to this edition.`);
  }

  if (series.metrics!.peakMonth) {
    const peaks = others.map((other) => `${other.lang} ${other.metrics!.peakMonth ?? 'none'}`).join(', ');
    series.signals.push(`Yearly peak in month ${series.metrics!.peakMonth}; other editions: ${peaks}.`);
  }
}

/**
 * Evidence from other editions of the same topic in this run: is the biggest spike shared across
 * languages, and do yearly peaks fall in the same month? Appends sentences to each series' `signals`.
 */
export function addCrossLanguageSignals(series: SeriesResult[]): void {
  const groups = new Map<string, SeriesResult[]>();

  for (const item of series) {
    if (item.status !== 'ok' || !item.metrics) {
      continue;
    }

    const key = item.basket ? `basket:${item.topic}` : item.qid ?? '(manual articles)';
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  for (const group of groups.values()) {
    for (const item of group) {
      addSignalsFromOtherEditions(item, group.filter((other) => other.lang !== item.lang));
    }
  }
}
