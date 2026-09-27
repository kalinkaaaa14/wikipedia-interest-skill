import type { ConfidenceLevel } from '../../scripts/types/confidence-level.ts';
import type { SeriesResult } from '../../scripts/types/series-result.ts';

/** A finished "growing" series with the given growth %, views/month and confidence; other metrics are neutral. */
export function fakeSeries(label: string, growth: number, views: number, confidence: ConfidenceLevel): SeriesResult {
  return {
    label,
    lang: 'xx',
    title: label,
    topic: 'topic',
    status: 'ok',
    monthly: [],
    reasons: [],
    notes: [],
    signals: [],
    confidence,
    direction: 'growing',
    metrics: {
      avgMonthlyViews: views,
      avgPerMillion: 1,
      yoyViewsPct: growth,
      yoySharePct: growth,
      yoyShareRobustPct: growth,
      trendPctPerYear: growth,
      trendP: 0.01,
      spikeSharePct: 0,
      topSpikes: [],
      spikeDates: [],
      firstDataMonth: '2024-01',
      peakMonth: null,
      weekdayRatio: null,
      peakWeekdayRatio: null,
      levelShift: null,
    },
  };
}
