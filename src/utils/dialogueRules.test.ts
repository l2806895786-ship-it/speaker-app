/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIALOGUE_TURNS,
  normalizeTranscript,
  checkKeyWords,
  evaluateAttempt,
  calculateStars,
} from './dialogueRules.ts';

test('normalizeTranscript ignores punctuation, capitalization and extra spaces', () => {
  assert.equal(
    normalizeTranscript('Can I have a hot chocolate, please?!'),
    'can i have a hot chocolate please'
  );
  assert.equal(
    normalizeTranscript('  YES,   THAT\'S EVERYTHING...  '),
    'yes that s everything'
  );
});

test('checkKeyWords verifies presence of all key words', () => {
  assert.equal(
    checkKeyWords('Can I have hot chocolate, please?', ['have', 'hot', 'chocolate']),
    true
  );
  assert.equal(
    checkKeyWords('I want chocolate please', ['have', 'hot', 'chocolate']),
    false // missing 'have' and 'hot'
  );
});

test('evaluateAttempt handles empty or silence input', () => {
  const result = evaluateAttempt(0, '', 1);
  assert.equal(result.isSuccess, false);
  assert.equal(result.type, 'NO_SPEECH');
  assert.match(result.feedbackText, /didn't catch that/i);
});

test('evaluateAttempt gives SUCCESS on exact match', () => {
  const result = evaluateAttempt(0, 'Can I have a hot chocolate, please?', 1);
  assert.equal(result.isSuccess, true);
  assert.equal(result.type, 'SUCCESS');
  assert.match(result.feedbackText, /Perfect! I understood/i);
});

test('evaluateAttempt gives SUCCESS_MISSING_POLITE when missing please', () => {
  const result = evaluateAttempt(0, 'Can I have a hot chocolate?', 1);
  assert.equal(result.isSuccess, true);
  assert.equal(result.type, 'SUCCESS_MISSING_POLITE');
  assert.match(result.feedbackText, /Add 'please' to sound more polite/i);
});

test('evaluateAttempt progressive scaffolding on consecutive failed attempts', () => {
  // Attempt 1 -> Recast
  const res1 = evaluateAttempt(0, 'Give me coffee', 1);
  assert.equal(res1.isSuccess, false);
  assert.equal(res1.type, 'RECAST');
  assert.match(res1.feedbackText, /Nice try! You can say/i);

  // Attempt 2 -> Elicitation (first letter hint)
  const res2 = evaluateAttempt(0, 'Give me coffee', 2);
  assert.equal(res2.isSuccess, false);
  assert.equal(res2.type, 'ELICITATION');
  assert.match(res2.feedbackText, /You're almost there! "Can I have a hot chocolate, p___/i);

  // Attempt 3 -> Chunking
  const res3 = evaluateAttempt(0, 'Give me coffee', 3);
  assert.equal(res3.isSuccess, false);
  assert.equal(res3.type, 'CHUNKING');
  assert.match(res3.feedbackText, /Let's say it in small parts: 'Can I have' \/ 'a hot chocolate' \/ 'please.'/i);
});

test('calculateStars reflects PRD participation rules without numerical scoring', () => {
  // 5 completed with 5 spoken -> 3 stars
  const threeStars = calculateStars(5, 5);
  assert.equal(threeStars.stars, 3);

  // 3-4 completed -> 2 stars
  const twoStars = calculateStars(4, 3);
  assert.equal(twoStars.stars, 2);

  // 1-2 completed -> 1 star
  const oneStar = calculateStars(1, 1);
  assert.equal(oneStar.stars, 1);
});
