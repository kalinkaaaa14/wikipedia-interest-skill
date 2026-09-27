import type { ConfidenceLevel } from '../../types/confidence-level.ts';
import type { DailySeries } from '../../types/daily-series.ts';
import type { MonthPoint } from '../../types/month-point.ts';
import type { SeriesResult } from '../../types/series-result.ts';
import type { SeriesSpec } from '../../types/series-spec.ts';
import { addMonths } from '../dates/add-months.ts';
import { mannKendall } from '../stats/mann-kendall.ts';
import { sum } from '../stats/sum.ts';
import { theilSenSlope } from '../stats/theil-sen-slope.ts';
import { classifyDirection } from './classify-direction.ts';
import { despike } from './despike.ts';
import { detectLevelShift } from './detect-level-shift.ts';
import { LATEST_FULL_MONTH_START_DAY } from './latest-full-month-start-day.ts';
import { seasonalPeakMonth } from './seasonal-peak-month.ts';
import { weekdayRatio } from './weekday-ratio.ts';

const CONFIDENCE_ORDER: ConfidenceLevel[] = ['low', 'medium', 'high'];

/** The lower of two confidence levels: a problem can only cap confidence, never raise it. */
function capConfidence(current: ConfidenceLevel, cap: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_ORDER[Math.min(CONFIDENCE_ORDER.indexOf(current), CONFIDENCE_ORDER.indexOf(cap))];
}

function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? (current / previous - 1) * 100 : null;
}

function roundTo(value: number | null, decimals = 1): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

function describeRhythm(ratio: number): string {
  if (ratio >= 1.3) {
    return 'read relatively more on weekdays than the edition overall';
  }

  if (ratio <= 0.77) {
    return 'read relatively more on weekends than the edition overall';
  }

  return 'same weekly rhythm as the edition overall';
}

function seriesLabel(spec: SeriesSpec): string {
  if (spec.basket) {
    return `${spec.lang}: ${spec.topic} (basket of ${spec.basket.length})`;
  }

  return spec.title ? `${spec.lang}: ${spec.title}` : `${spec.lang}: (no article)`;
}

export function analyzeSeries(spec: SeriesSpec, daily: DailySeries | null, editionDaily: DailySeries, months: string[], days: string[]): SeriesResult {
  const base = { label: seriesLabel(spec), lang: spec.lang, title: spec.title, topic: spec.topic, qid: spec.qid, reasons: [], notes: [], signals: [] };
  const editionMonthly = new Map<string, number>();

  for (const day of days) {
    const month = day.slice(0, 7);
    editionMonthly.set(month, (editionMonthly.get(month) ?? 0) + (editionDaily.get(day) ?? 0));
  }

  const emptyMonthly = months.map((month) => ({ month, views: null, viewsRobust: null, projectViews: editionMonthly.get(month) ?? 0, perMillion: null }));

  if (!spec.title && !spec.basket) {
    return { ...base, status: 'no_article', monthly: emptyMonthly, notes: [`No ${spec.lang} Wikipedia article for this topic (possible content gap).`] };
  }

  if (!daily || daily.size === 0) {
    return { ...base, status: 'no_data', monthly: emptyMonthly, notes: ['The API returned no pageviews for this article in the period.'] };
  }

  // Days before the first recorded view = the article did not exist yet. Missing days after that = 0 views.
  const firstDay = [...daily.keys()].sort()[0];
  const activeDays = days.filter((day) => day >= firstDay);
  const dailyViews = activeDays.map((day) => daily.get(day) ?? 0);
  const { robustValues, spikeIndexes } = despike(dailyViews);
  const monthlyViews = new Map<string, number>();
  const monthlyRobustViews = new Map<string, number>();

  activeDays.forEach((day, index) => {
    const month = day.slice(0, 7);
    monthlyViews.set(month, (monthlyViews.get(month) ?? 0) + dailyViews[index]);
    monthlyRobustViews.set(month, (monthlyRobustViews.get(month) ?? 0) + robustValues[index]);
  });

  // A partially covered first month would look like growth, so it is treated as missing.
  const firstMonth = firstDay.slice(0, 7);
  const firstFullMonth = Number(firstDay.slice(8, 10)) <= LATEST_FULL_MONTH_START_DAY ? firstMonth : addMonths(firstMonth, 1);
  const monthly: MonthPoint[] = months.map((month) => {
    const editionViews = editionMonthly.get(month) ?? 0;

    if (month < firstFullMonth) {
      return { month, views: null, viewsRobust: null, projectViews: editionViews, perMillion: null };
    }

    const views = monthlyViews.get(month) ?? 0;

    return { month, views, viewsRobust: monthlyRobustViews.get(month) ?? 0, projectViews: editionViews, perMillion: editionViews > 0 ? (views / editionViews) * 1e6 : null };
  });
  const activeMonths = monthly.filter((point) => point.views !== null);

  if (activeMonths.length === 0) {
    return { ...base, status: 'no_data', monthly, notes: ['Article was created in the last month of the period; not enough data.'] };
  }

  const lastYear = activeMonths.slice(-12);
  const avgMonthlyViews = sum(lastYear.map((point) => point.views!)) / lastYear.length;
  const avgPerMillion = (sum(lastYear.map((point) => point.views!)) / sum(lastYear.map((point) => point.projectViews))) * 1e6;

  // Year-over-year on the last 24 active months: the same calendar months, so seasonality cancels out.
  let yoyViewsPct: number | null = null;
  let yoySharePct: number | null = null;
  let yoyShareRobustPct: number | null = null;

  if (activeMonths.length >= 24) {
    const currentYear = activeMonths.slice(-12);
    const previousYear = activeMonths.slice(-24, -12);
    const total = (points: MonthPoint[], pick: (point: MonthPoint) => number) => sum(points.map(pick));
    const share = (points: MonthPoint[], pick: (point: MonthPoint) => number) => total(points, pick) / total(points, (point) => point.projectViews);
    yoyViewsPct = percentChange(total(currentYear, (point) => point.views!), total(previousYear, (point) => point.views!));
    yoySharePct = percentChange(share(currentYear, (point) => point.views!), share(previousYear, (point) => point.views!));
    yoyShareRobustPct = percentChange(share(currentYear, (point) => point.viewsRobust!), share(previousYear, (point) => point.viewsRobust!));
  }

  // Trend on log(robust share): the slope is a % change rate, comparable across editions of any size.
  let trendPctPerYear: number | null = null;
  let trendP: number | null = null;

  if (activeMonths.length >= 12) {
    const logShare = activeMonths.map((point) => Math.log(Math.max((point.viewsRobust! / point.projectViews) * 1e6, 1e-3)));
    trendPctPerYear = (Math.exp(theilSenSlope(logShare) * 12) - 1) * 100;
    trendP = mannKendall(logShare).pValue;
  }

  const totalViews = sum(dailyViews);
  const spikeSharePct = totalViews > 0 ? (sum(spikeIndexes.map((index) => dailyViews[index] - robustValues[index])) / totalViews) * 100 : 0;
  const topSpikes = spikeIndexes
    .map((index) => ({ date: activeDays[index], views: dailyViews[index] }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 3);

  const growth = yoyShareRobustPct ?? trendPctPerYear;
  const levelShift = detectLevelShift(activeMonths.map((point) => point.viewsRobust!));
  // A shift inside the last 24 months drives the year-over-year number by itself, so the direction cannot be read from it.
  const shiftInYoyWindow = levelShift !== null && levelShift.index >= activeMonths.length - 24;
  const direction = shiftInYoyWindow ? 'unclear' : classifyDirection(growth, trendPctPerYear, trendP);

  // Confidence starts high; every problem found caps it and adds a reason.
  let confidence: ConfidenceLevel = 'high';
  const reasons: string[] = [];
  const flag = (cap: ConfidenceLevel, reason: string) => {
    confidence = capConfidence(confidence, cap);
    reasons.push(reason);
  };

  if (avgMonthlyViews < 300) {
    flag('low', `Very small base (~${Math.round(avgMonthlyViews)} views/month): percentages are noisy.`);
  } else if (avgMonthlyViews < 3000) {
    flag('medium', `Small base (~${Math.round(avgMonthlyViews)} views/month).`);
  }

  if (spikeSharePct > 50) {
    flag('low', `${Math.round(spikeSharePct)}% of views came from short spikes (news-driven, not sustained interest).`);
  } else if (spikeSharePct > 20) {
    flag('medium', `${Math.round(spikeSharePct)}% of views came from short spikes.`);
  }

  if (yoySharePct !== null && yoyShareRobustPct !== null && Math.abs(yoySharePct) > 5 && Math.sign(yoySharePct) !== Math.sign(yoyShareRobustPct)) {
    flag('low', 'The year-over-year change reverses once spikes are removed.');
  }

  if (yoySharePct === null) {
    flag('medium', 'Less than 24 months of data: no same-month year-over-year comparison, seasonality may distort the trend.');
  }

  if (trendP !== null && trendP >= 0.1) {
    flag('medium', `Trend is not statistically distinguishable from flat (Mann–Kendall p=${trendP.toFixed(2)}).`);
  }

  if (direction === 'unclear' && growth !== null && !shiftInYoyWindow) {
    flag('medium', 'Year-over-year change and long-run trend disagree.');
  }

  if (levelShift) {
    const shiftMonth = activeMonths[levelShift.index].month;
    flag('medium', `Abrupt level shift around ${shiftMonth} (×${levelShift.ratio.toFixed(2)} within a few months): check for an article rename/redirect change or an external traffic change before reading it as a change in interest.`);
  }

  if (firstFullMonth > months[0]) {
    flag('medium', `Article has data only since ${firstFullMonth} (created or renamed during the period).`);
  }

  const notes: string[] = [];

  if (yoyViewsPct !== null && yoySharePct !== null && Math.sign(yoyViewsPct) !== Math.sign(yoySharePct) && Math.abs(yoyViewsPct - yoySharePct) > 5) {
    notes.push(`Raw views ${yoyViewsPct > 0 ? 'rose' : 'fell'} ${Math.abs(Math.round(yoyViewsPct))}% but the share of edition traffic ${yoySharePct > 0 ? 'rose' : 'fell'}: overall ${spec.lang}.wikipedia traffic changed.`);
  }

  const peakMonth = seasonalPeakMonth(activeMonths.map((point) => ({ month: point.month, value: point.viewsRobust! })));

  if (peakMonth) {
    notes.push(`Strong yearly seasonality (peaks in month ${peakMonth}): compare same months only; short periods can mislead.`);
  }

  if (topSpikes.length) {
    notes.push(`Biggest spike: ${topSpikes[0].date} (${topSpikes[0].views.toLocaleString('en')} views).`);
  }

  const signals: string[] = [];
  let lastYearWeekdayRatio: number | null = null;
  let peakWeekdayRatio: number | null = null;

  if (avgMonthlyViews >= 300) {
    const ratioOnDays = (keepDay: (day: string) => boolean) => {
      const indexes = activeDays.flatMap((day, index) => (keepDay(day) ? [index] : []));

      return weekdayRatio(indexes.map((index) => activeDays[index]), indexes.map((index) => robustValues[index]), editionDaily);
    };
    lastYearWeekdayRatio = ratioOnDays((day) => day.slice(0, 7) >= lastYear[0].month);

    if (lastYearWeekdayRatio !== null) {
      signals.push(`Weekday/weekend ratio ${lastYearWeekdayRatio.toFixed(2)}× the edition's own: ${describeRhythm(lastYearWeekdayRatio)} (last 12 months).`);
    }

    peakWeekdayRatio = peakMonth ? ratioOnDays((day) => day.slice(5, 7) === peakMonth) : null;

    if (peakWeekdayRatio !== null) {
      signals.push(`In the peak month (${peakMonth}): ratio ${peakWeekdayRatio.toFixed(2)}×, ${describeRhythm(peakWeekdayRatio)}.`);
    }
  }

  return {
    ...base,
    status: 'ok',
    monthly,
    metrics: {
      avgMonthlyViews: Math.round(avgMonthlyViews),
      avgPerMillion: roundTo(avgPerMillion, 2)!,
      yoyViewsPct: roundTo(yoyViewsPct),
      yoySharePct: roundTo(yoySharePct),
      yoyShareRobustPct: roundTo(yoyShareRobustPct),
      trendPctPerYear: roundTo(trendPctPerYear),
      trendP: roundTo(trendP, 3),
      spikeSharePct: roundTo(spikeSharePct)!,
      topSpikes,
      spikeDates: spikeIndexes.map((index) => activeDays[index]),
      firstDataMonth: firstFullMonth,
      peakMonth,
      weekdayRatio: roundTo(lastYearWeekdayRatio, 2),
      peakWeekdayRatio: roundTo(peakWeekdayRatio, 2),
      levelShift: levelShift ? { month: activeMonths[levelShift.index].month, ratio: roundTo(levelShift.ratio, 2)!, inYoyWindow: shiftInYoyWindow } : null,
    },
    direction,
    confidence,
    reasons,
    notes,
    signals,
  };
}
