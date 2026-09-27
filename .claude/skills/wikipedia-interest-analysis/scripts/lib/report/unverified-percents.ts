import type { AnalysisResult } from '../../types/analysis-result.ts';

/** Every percentage the analysis produced, so the agent's text can be checked against it. */
function knownPercents(result: AnalysisResult): number[] {
  const percents: number[] = [];

  for (const series of result.series) {
    const metrics = series.metrics;

    if (!metrics) {
      continue;
    }

    for (const value of [metrics.yoyViewsPct, metrics.yoySharePct, metrics.yoyShareRobustPct, metrics.trendPctPerYear, metrics.spikeSharePct]) {
      if (value !== null) {
        percents.push(value);
      }
    }

    for (const member of series.basket?.members ?? []) {
      percents.push(member.shareOfBasketPct);

      if (member.yoyShareRobustPct !== null) {
        percents.push(member.yoyShareRobustPct);
      }
    }
  }

  return percents;
}

/** Percentages in agent-written text that match no computed value (±1 pp). Catches hallucinated numbers. */
export function unverifiedPercents(text: string, result: AnalysisResult): string[] {
  const known = knownPercents(result).map(Math.abs);
  const found = text.match(/[+\-−]?\d+(?:[.,]\d+)?\s?%/g) ?? [];

  return found.filter((match) => {
    const value = Math.abs(parseFloat(match.replace(/[+\-−%\s]/g, '').replace(',', '.')));

    return !known.some((knownValue) => Math.abs(knownValue - value) <= 1);
  });
}
