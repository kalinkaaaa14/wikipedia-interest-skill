import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addMonths } from '../scripts/lib/dates/add-months.ts';
import { apiLastDay } from '../scripts/lib/dates/api-last-day.ts';
import { lastCompleteMonth } from '../scripts/lib/dates/last-complete-month.ts';
import { monthRange } from '../scripts/lib/dates/month-range.ts';

test('dates', () => {
  assert.equal(addMonths('2024-11', 3), '2025-02');
  assert.equal(monthRange('2024-11', '2025-02').length, 4);
  assert.equal(apiLastDay('2024-02'), '20240229');
  assert.equal(lastCompleteMonth(new Date('2026-09-26T00:00:00Z')), '2026-08');
});
