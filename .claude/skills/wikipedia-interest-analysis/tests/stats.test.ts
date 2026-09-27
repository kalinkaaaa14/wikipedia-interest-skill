import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mannKendall } from '../scripts/lib/stats/mann-kendall.ts';
import { median } from '../scripts/lib/stats/median.ts';
import { medianAbsoluteDeviation } from '../scripts/lib/stats/median-absolute-deviation.ts';
import { normalCdf } from '../scripts/lib/stats/normal-cdf.ts';
import { theilSenSlope } from '../scripts/lib/stats/theil-sen-slope.ts';

test('median / medianAbsoluteDeviation', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(medianAbsoluteDeviation([1, 1, 1, 1]), 0);
});

test('normalCdf matches known values', () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-7);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
});

test('theilSenSlope recovers slope and ignores an outlier', () => {
  const values = Array.from({ length: 24 }, (_slot, index) => 2 * index + 5);
  values[10] = 1000;
  assert.equal(theilSenSlope(values), 2);
});

test('mannKendall: rising series is significant, noise is not', () => {
  const rising = Array.from({ length: 24 }, (_slot, index) => index + (index % 3));
  assert.ok(mannKendall(rising).pValue < 0.01);
  const noise = [5, 3, 6, 4, 5, 3, 6, 4, 5, 3, 6, 4, 5, 3, 6, 4, 5, 3, 6, 4, 5, 3, 6, 4];
  assert.ok(mannKendall(noise).pValue > 0.1);
  assert.equal(mannKendall([1, 1, 1, 1]).pValue, 1);
});
