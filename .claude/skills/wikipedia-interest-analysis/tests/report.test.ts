import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unverifiedPercents } from '../scripts/lib/report/unverified-percents.ts';
import { fakeSeries } from './helpers/fake-series.ts';

test('unverifiedPercents catches invented numbers, accepts rounded real ones', () => {
  const result = { series: [fakeSeries('a', -33.6, 100, 'low')] } as never;
  assert.deepEqual(unverifiedPercents('Interest fell −34% (share).', result), []);
  assert.deepEqual(unverifiedPercents('Interest grew 25%.', result), ['25%']);
});
