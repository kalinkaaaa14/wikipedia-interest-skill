import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isInsideSkill } from '../scripts/cli/is-inside-skill.ts';
import { parseBasket } from '../scripts/cli/parse-basket.ts';

test('isInsideSkill: the skill folder and its subfolders, not neighbours or parents', () => {
  const skill = '/p/.claude/skills/wikipedia-interest-analysis';
  assert.equal(isInsideSkill(skill, skill), true);
  assert.equal(isInsideSkill(`${skill}/scripts`, skill), true);
  assert.equal(isInsideSkill('/p', skill), false);
  assert.equal(isInsideSkill('/p/.claude/skills/wikipedia-interest-analysis-old', skill), false);
});

test('parseBasket: several baskets, dedup, and clear errors', () => {
  assert.deepEqual(parseBasket('astronomy=Q333,Q589,Q589; chemistry = Q2329,Q11173'), [
    { name: 'astronomy', qids: ['Q333', 'Q589'] },
    { name: 'chemistry', qids: ['Q2329', 'Q11173'] },
  ]);
  assert.throws(() => parseBasket('astronomy'), /Expected name=Q1,Q2/);
  assert.throws(() => parseBasket('astronomy=Q333,black hole'), /Expected name=Q1,Q2/);
  assert.throws(() => parseBasket(`big=${Array.from({ length: 26 }, (_slot, index) => `Q${index + 1}`).join(',')}`), /maximum is 25/);
});
