import { join } from 'node:path';
import type { AnalysisResult } from '../types/analysis-result.ts';

/** What the agent sees: compact, no daily/monthly arrays (those stay in data.json). */
export function buildCompactSummary(result: AnalysisResult, dir: string) {
  return {
    run_dir: dir,
    period: result.period,
    findings: result.findings,
    series: result.series.map((series) => ({
      label: series.label,
      topic: series.topic,
      status: series.status,
      direction: series.direction,
      confidence: series.confidence,
      avg_monthly_views: series.metrics?.avgMonthlyViews,
      share_yoy_pct_robust: series.metrics?.yoyShareRobustPct,
      views_yoy_pct: series.metrics?.yoyViewsPct,
      trend_pct_per_year: series.metrics?.trendPctPerYear,
      trend_p: series.metrics?.trendP,
      spike_share_pct: series.metrics?.spikeSharePct,
      reasons: series.reasons,
      notes: series.notes,
      signals: series.signals,
      ...(series.basket
        ? {
          basket: {
            members: series.basket.members.map((member) => ({
              label: member.label,
              qid: member.qid,
              share_of_basket_pct: member.shareOfBasketPct,
              share_yoy_pct_robust: member.yoyShareRobustPct,
              direction: member.direction,
            })),
            excluded: series.basket.excluded,
          },
        }
        : {}),
    })),
    ranking: result.ranking,
    chart: join(dir, 'chart.svg'),
  };
}
