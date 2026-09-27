import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparableCandidates } from '../scripts/lib/wikidata/comparable-candidates.ts';
import { hasFieldClass } from '../scripts/lib/wikidata/has-field-class.ts';
import { pickMostCovered } from '../scripts/lib/wikidata/pick-most-covered.ts';
import type { Candidate } from '../scripts/types/candidate.ts';

function candidate(qid: string, wikipediaEditions: number): Candidate {
  return { qid, label: qid, description: '', articles: {}, wikipediaEditions };
}

test('comparableCandidates flags several major topics (Mercury: planet + element)', () => {
  const mercury = [candidate('Q613883', 27), candidate('Q1231263', 35), candidate('Q308', 251), candidate('Q165745', 40), candidate('Q925', 176), candidate('Q1150', 84)];
  assert.deepEqual(comparableCandidates(mercury), ['Q308', 'Q925']);
});

test('comparableCandidates keeps one dominant topic unambiguous (chess, English language)', () => {
  assert.deepEqual(comparableCandidates([candidate('Q718', 203), candidate('Q843284', 19), candidate('Q471257', 39), candidate('Q1076338', 42)]), ['Q718']);
  assert.deepEqual(comparableCandidates([candidate('Q1860', 318), candidate('Q328', 131), candidate('Q186579', 76)]), ['Q1860']);
});

test('comparableCandidates handles empty and zero-coverage input', () => {
  assert.deepEqual(comparableCandidates([]), []);
  assert.deepEqual(comparableCandidates([candidate('Q1', 0), candidate('Q2', 0)]), []);
});

test('pickMostCovered prefers the concept over an exact-title book (Big Bang)', () => {
  assert.equal(pickMostCovered([candidate('Q858479', 3), candidate('Q323', 150)]).qid, 'Q323');
});

test('hasFieldClass: academic fields yes; games, hobbies, planets and languages no', () => {
  assert.equal(hasFieldClass(['Q2465832', 'Q11862829']), true); // astronomy: branch of science, academic discipline
  assert.equal(hasFieldClass(['Q11862829', 'Q374814', 'Q2267705']), true); // machine learning
  assert.equal(hasFieldClass(['Q131436', 'Q31629', 'Q47728']), false); // chess: board game, sport, hobby
  assert.equal(hasFieldClass(['Q3504248', 'Q3901935']), false); // Mercury (planet)
  assert.equal(hasFieldClass(['Q33742', 'Q34770']), false); // English language
  assert.equal(hasFieldClass([]), false);
});
