import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeBasketForReport } from '../scripts/lib/report/describe-basket-for-report.ts';
import { unverifiedPercents } from '../scripts/lib/report/unverified-percents.ts';
import { fakeSeries } from './helpers/fake-series.ts';

test('unverifiedPercents catches invented numbers, accepts rounded real ones', () => {
  const result = { series: [fakeSeries('a', -33.6, 100, 'low')] } as never;
  assert.deepEqual(unverifiedPercents('Interest fell −34% (share).', result), []);
  assert.deepEqual(unverifiedPercents('Interest grew 25%.', result), ['25%']);
});

test('describeBasketForReport lists growing and declining subtopics with their change, biggest first', () => {
  const members = [
    { qid: 'Q1', label: 'Solar eclipse', shareOfBasketPct: 29, yoyShareRobustPct: 45.3, direction: 'growing' as const },
    { qid: 'Q2', label: 'Solar System', shareOfBasketPct: 22, yoyShareRobustPct: -15.6, direction: 'declining' as const },
    { qid: 'Q3', label: 'Black hole', shareOfBasketPct: 15, yoyShareRobustPct: -3.5, direction: 'flat' as const },
    ...Array.from({ length: 6 }, (_slot, index) => ({ qid: `Q${index + 10}`, label: `Planet ${index}`, shareOfBasketPct: 2, yoyShareRobustPct: -20, direction: 'declining' as const })),
  ];
  const series = { ...fakeSeries('pl: astronomy (basket of 9)', -5, 50000, 'medium'), basket: { members, excluded: ['James Webb: no uk article'] } };
  assert.equal(
    describeBasketForReport(series),
    'pl: astronomy (basket of 9) — growing: Solar eclipse +45.3%; declining: Solar System -15.6%, Planet 0 -20%, Planet 1 -20%, Planet 2 -20%, Planet 3 -20% +2 more; not in every language: 1',
  );
});
