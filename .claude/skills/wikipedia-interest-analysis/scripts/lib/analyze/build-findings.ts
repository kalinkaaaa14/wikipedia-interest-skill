import type { BasketBreakdown } from '../../types/basket-breakdown.ts';
import type { Direction } from '../../types/direction.ts';
import type { RankRow } from '../../types/rank-row.ts';
import type { RankingWeights } from '../../types/ranking-weights.ts';
import type { SeriesMetrics } from '../../types/series-metrics.ts';
import type { SeriesResult } from '../../types/series-result.ts';
import { formatSignedPercent } from './format-signed-percent.ts';
import { rankingFormula } from './ranking-formula.ts';

function describeDirection(series: SeriesResult, metrics: SeriesMetrics): string {
  if (metrics.levelShift?.inYoyWindow) {
    return `unclear (one abrupt level shift around ${metrics.levelShift.month}, ×${metrics.levelShift.ratio}, drives the change; the trend is unconfirmed until the shift is explained)`;
  }

  if (series.direction === 'flat') {
    return `flat (no significant change: ${formatSignedPercent(metrics.yoyShareRobustPct ?? metrics.trendPctPerYear)} is within ±10%, so neither growth nor decline)`;
  }

  return String(series.direction);
}

function describeSeries(series: SeriesResult, metrics: SeriesMetrics): string {
  const growth = metrics.yoyShareRobustPct !== null
    ? `share of ${series.lang}.wikipedia views ${formatSignedPercent(metrics.yoyShareRobustPct)} year-over-year (spikes removed; raw views ${formatSignedPercent(metrics.yoyViewsPct)})`
    : `trend ${formatSignedPercent(metrics.trendPctPerYear)}/year`;

  return `${series.label}: ${describeDirection(series, metrics)}, ${growth}; ~${metrics.avgMonthlyViews.toLocaleString('en')} views/month; confidence ${series.confidence}.`;
}

function describeBasket(label: string, basket: BasketBreakdown): string {
  const namesWith = (direction: Direction) => basket.members.filter((member) => member.direction === direction).map((member) => member.label);
  const parts = (['growing', 'declining'] as const)
    .filter((direction) => namesWith(direction).length)
    .map((direction) => `${direction}: ${namesWith(direction).join(', ')}`);
  const summary = parts.length ? parts.join('; ') : 'none clearly growing or declining';
  const excluded = basket.excluded.length ? ` Excluded: ${basket.excluded.join('; ')}.` : '';

  return `${label} subtopics: ${summary}.${excluded}`;
}

/** Plain-language findings generated from numbers, so the agent never has to invent them. */
export function buildFindings(series: SeriesResult[], ranking: RankRow[], weights?: RankingWeights): string[] {
  const findings: string[] = [];

  for (const item of series) {
    if (item.status !== 'ok' || !item.metrics) {
      findings.push(`${item.label}: ${item.notes[0] ?? item.status}`);
      continue;
    }

    findings.push(describeSeries(item, item.metrics));

    if (item.basket) {
      findings.push(describeBasket(item.label, item.basket));
    }
  }

  if (ranking.length) {
    const formula = weights ? ` ${rankingFormula(weights)}` : '';
    findings.push(`Highest score: ${ranking[0].label} (${ranking[0].score}/100).${formula}`);
  }

  return findings;
}
