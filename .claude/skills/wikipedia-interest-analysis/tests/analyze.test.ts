import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addCrossLanguageSignals } from '../scripts/lib/analyze/add-cross-language-signals.ts';
import { analyzeSeries } from '../scripts/lib/analyze/analyze-series.ts';
import { buildFindings } from '../scripts/lib/analyze/build-findings.ts';
import { classifyDirection } from '../scripts/lib/analyze/classify-direction.ts';
import { combineBasket } from '../scripts/lib/analyze/combine-basket.ts';
import { despike } from '../scripts/lib/analyze/despike.ts';
import { detectLevelShift } from '../scripts/lib/analyze/detect-level-shift.ts';
import { rankSeries } from '../scripts/lib/analyze/rank-series.ts';
import { rankingFormula } from '../scripts/lib/analyze/ranking-formula.ts';
import { seasonalPeakMonth } from '../scripts/lib/analyze/seasonal-peak-month.ts';
import { weekdayRatio } from '../scripts/lib/analyze/weekday-ratio.ts';
import { monthRange } from '../scripts/lib/dates/month-range.ts';
import { fakeSeries } from './helpers/fake-series.ts';
import { syntheticDays } from './helpers/synthetic-days.ts';

test('despike flags a one-day news spike but not steady growth', () => {
  const steady = Array.from({ length: 120 }, (_slot, index) => 100 + index * 2);
  assert.equal(despike(steady).spikeIndexes.length, 0);
  const spiky = Array.from({ length: 120 }, () => 100);
  spiky[60] = 2000;
  const result = despike(spiky);
  assert.deepEqual(result.spikeIndexes, [60]);
  assert.equal(result.robustValues[60], 100);
});

test('detectLevelShift finds a sudden drop and ignores gradual change', () => {
  const drop = [...Array(12).fill(800), ...Array(12).fill(200)];
  const shift = detectLevelShift(drop);
  assert.ok(shift && shift.index === 12 && shift.ratio === 0.25);
  const gradual = Array.from({ length: 24 }, (_slot, index) => 100 * 1.03 ** index);
  assert.equal(detectLevelShift(gradual), null);
});

test('detectLevelShift ignores a summer dip that repeats every year; seasonalPeakMonth finds the peak', () => {
  // School-subject pattern: Sep peak, Jun–Aug trough, three identical years.
  const year = [100, 100, 90, 90, 80, 30, 25, 30, 200, 120, 110, 100];
  const values = [...year, ...year, ...year];
  assert.equal(detectLevelShift(values), null);
  const points = values.map((value, index) => ({ month: `20${23 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`, value }));
  assert.equal(seasonalPeakMonth(points), '09');
  assert.equal(seasonalPeakMonth(points.map((point) => ({ ...point, value: 100 }))), null);
});

test('rankSeries: growth-only weights order by growth; low confidence is discounted', () => {
  const series = [fakeSeries('a', 10, 1000, 'high'), fakeSeries('b', 50, 100, 'high'), fakeSeries('c', 30, 5000, 'low')];
  assert.deepEqual(rankSeries(series, { growth: 1, size: 0 }).map((row) => row.label), ['b', 'c', 'a']);
  assert.equal(rankSeries(series, { growth: 1, size: 0 }).find((row) => row.label === 'c')!.score, 25); // 0.5 percentile × 0.5
});

// Real values (24 months to 2026-08): robust share YoY %, trend %/yr, Mann–Kendall p.
test('classifyDirection: borderline YoY with a strong same-way trend is a real move', () => {
  assert.equal(classifyDirection(-9.6, -15.4, 0.003), 'declining'); // fr: Mercure (planète)
  assert.equal(classifyDirection(8.8, 12.3, 0.031), 'growing'); // fr: Barcelone
});

test('classifyDirection: stays flat without a strong trend, or when YoY is ~0', () => {
  assert.equal(classifyDirection(0.2, -3.3, 0.568), 'flat'); // fr: Football
  assert.equal(classifyDirection(-5.1, -8.5, 0.0), 'flat'); // en: Mercury (element): trend < 10%/yr
  assert.equal(classifyDirection(-0.6, -15.9, 0.045), 'flat'); // fr: Marie Curie: YoY < 5%
  assert.equal(classifyDirection(8.1, -1.9, 0.98), 'flat'); // pl: Piłka nożna
});

test('classifyDirection: large changes still need a significant trend', () => {
  assert.equal(classifyDirection(-21.6, -24.3, 0.001), 'declining'); // pl: Szachy
  assert.equal(classifyDirection(25.2, 13.3, 0.07), 'growing'); // de: Fußball
  assert.equal(classifyDirection(-20, -15, 0.4), 'unclear');
  assert.equal(classifyDirection(null, null, null), 'unclear');
});

test('weekdayRatio is relative to the edition rhythm', () => {
  const days = Array.from({ length: 56 }, (_slot, index) => new Date(Date.UTC(2025, 0, 6 + index)).toISOString().slice(0, 10)); // 8 weeks from a Monday
  const isWeekend = (day: string) => new Date(day).getUTCDay() % 6 === 0;
  const study = days.map((day) => (isWeekend(day) ? 10 : 20)); // twice as much on weekdays
  assert.equal(weekdayRatio(days, study, new Map(days.map((day) => [day, 1000]))), 2); // edition flat → 2×
  assert.equal(weekdayRatio(days, study, new Map(days.map((day) => [day, isWeekend(day) ? 500 : 1000]))), 1); // same rhythm → 1×
  assert.equal(weekdayRatio(days.slice(0, 7), study.slice(0, 7), new Map()), null); // one week is too little
});

test('addCrossLanguageSignals: shared vs edition-specific spike, peak months', () => {
  const uk = { ...fakeSeries('uk', 0, 1000, 'high'), lang: 'uk', qid: 'Q1' };
  const de = { ...fakeSeries('de', 0, 1000, 'high'), lang: 'de', qid: 'Q1' };
  const fr = { ...fakeSeries('fr', 0, 1000, 'high'), lang: 'fr', qid: 'Q1' };
  uk.metrics!.topSpikes = [{ date: '2025-03-29', views: 900 }];
  uk.metrics!.spikeDates = ['2025-03-29'];
  de.metrics!.spikeDates = ['2025-03-30']; // one day later: the same event
  fr.metrics!.spikeDates = ['2025-06-01'];
  uk.metrics!.peakMonth = '09';
  de.metrics!.peakMonth = '09';
  addCrossLanguageSignals([uk, de, fr]);
  assert.match(uk.signals[0], /also appears in de within/);
  assert.match(uk.signals[1], /month 09; other editions: de 09, fr none/);
});

test('analyzeSeries: an abrupt drop inside the YoY window makes the direction unclear', () => {
  const months = monthRange('2024-01', '2025-12');
  const { days, article, edition } = syntheticDays(months, (monthIndex) => (monthIndex < 18 ? 300 : 100)); // ×0.33 in 2025-07
  const result = analyzeSeries({ lang: 'uk', title: 'T', topic: 'topic' }, article, edition, months, days);
  assert.equal(result.direction, 'unclear');
  // Months have 28–31 days, so neighbouring split points of the step almost tie: accept ±1 month.
  assert.match(result.metrics!.levelShift?.month ?? '', /^2025-0[67]$/);
  assert.ok(!result.reasons.some((reason) => reason.includes('disagree')));
  assert.match(buildFindings([result], [])[0], /abrupt level shift around 2025-0[67]/);
});

test('analyzeSeries: a steady decline stays "declining"', () => {
  const months = monthRange('2024-01', '2025-12');
  const { days, article, edition } = syntheticDays(months, (monthIndex) => 300 * 0.97 ** monthIndex);
  const result = analyzeSeries({ lang: 'uk', title: 'T', topic: 'topic' }, article, edition, months, days);
  assert.equal(result.direction, 'declining');
  assert.equal(result.metrics!.levelShift, null);
});

test('combineBasket sums members and drops articles created during the period', () => {
  const combined = combineBasket([
    { label: 'A', daily: new Map([['2024-01-01', 10], ['2024-01-02', 20]]) },
    { label: 'B', daily: new Map([['2024-01-03', 5], ['2024-01-04', 5]]) }, // first view on the 3rd: still counts (zero-view days are missing)
    { label: 'New', daily: new Map([['2024-03-15', 100]]) }, // created mid-period
    { label: 'Empty', daily: null },
  ], '2024-01');
  assert.deepEqual(combined.usedIndexes, [0, 1]);
  assert.equal(combined.daily.get('2024-01-01'), 10);
  assert.equal(combined.daily.get('2024-01-03'), 5);
  assert.equal(combined.daily.has('2024-03-15'), false);
  assert.deepEqual(combined.excluded, ['New: data only since 2024-03', 'Empty: no pageview data']);
});

test('basket: one growing subtopic inside stable ones shows up in the breakdown', () => {
  const months = monthRange('2024-01', '2025-12');
  const flat = syntheticDays(months, () => 300);
  const rising = syntheticDays(months, (monthIndex) => 100 * 1.05 ** monthIndex);
  const { daily } = combineBasket([{ label: 'A', daily: flat.article }, { label: 'B', daily: flat.article }, { label: 'C', daily: rising.article }], '2024-01');
  const basket = [{ qid: 'Q1', label: 'A', title: 'A' }, { qid: 'Q2', label: 'B', title: 'B' }, { qid: 'Q3', label: 'C', title: 'C' }];
  const result = analyzeSeries({ lang: 'uk', title: null, topic: 'field', basket }, daily, flat.edition, months, flat.days);
  assert.equal(result.status, 'ok');
  assert.equal(result.label, 'uk: field (basket of 3)');
  assert.ok(result.metrics!.yoyShareRobustPct! > 0); // the rising member lifts the basket
  const risingMember = analyzeSeries({ lang: 'uk', title: 'C', topic: 'C' }, rising.article, flat.edition, months, flat.days);
  assert.equal(risingMember.direction, 'growing');
});

test('buildFindings: a flat series says the percentage is not growth', () => {
  const series = { ...fakeSeries('vi: Tiếng Anh', 1.5, 12000, 'medium'), direction: 'flat' as const };
  assert.match(buildFindings([series], [])[0], /flat \(no significant change: \+1\.5% is within ±10%/);
});

test('rankingFormula uses the run weights and the same confidence factors as rankSeries()', () => {
  assert.match(rankingFormula({ growth: 0.3, size: 0.7 }), /0\.3 × growth percentile \+ 0\.7 × size percentile.*high 1, medium 0\.75, low 0\.5/);
});

test('rankSeries: flat and unclear series earn no growth points', () => {
  const vi = { ...fakeSeries('vi', 1.5, 1000, 'high'), direction: 'flat' as const };
  const de = { ...fakeSeries('de', -0.7, 1000, 'high'), direction: 'flat' as const };
  const uk = { ...fakeSeries('uk', -47, 1000, 'high'), direction: 'unclear' as const };
  const ranking = rankSeries([vi, de, uk], { growth: 1, size: 0 });
  assert.deepEqual(ranking.map((row) => row.score), [0, 0, 0]); // all growth values count as 0 → tie
  assert.equal(ranking.find((row) => row.label === 'vi')!.growthPct, 1.5); // the raw number is still shown
});

test('buildFindings: the Highest score line carries the formula', () => {
  const growing = fakeSeries('a', 20, 1000, 'high');
  const declining = fakeSeries('b', -20, 500, 'high');
  const weights = { growth: 0.6, size: 0.4 };
  assert.match(buildFindings([growing, declining], rankSeries([growing, declining], weights), weights).at(-1)!, /Highest score: a \(100\/100\)\. score = 100 × \(0\.6 × growth percentile/);
});
