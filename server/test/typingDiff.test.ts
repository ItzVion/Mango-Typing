import test from "node:test";
import assert from "node:assert/strict";
import { calculateTypingMetrics, diffWords } from "../../client/src/utils/typingDiff";

test("two one-character typos count as two character errors, not two whole-word penalties", () => {
  const typed = "the quik brovn ";
  const target = "the quick brown";
  const diff = diffWords(typed, target);

  assert.equal(diff.errors, 2);
  assert.equal(diff.correctChars, typed.length - 2);
});

test("net WPM is gross WPM minus character errors per minute", () => {
  const score = calculateTypingMetrics("the quik brovn ", "the quick brown", 30);

  assert.equal(score.errors, 2);
  assert.equal(score.rawWpm, 6);
  assert.equal(score.wpm, 2);
  assert.ok(score.wpm < score.rawWpm);
  assert.ok(score.accuracy < 100);
});

test("adjacent transposition is counted as one edit", () => {
  const diff = diffWords("teh ", "the");
  assert.equal(diff.errors, 1);
});

test("an unfinished correct prefix is not counted as an error", () => {
  const diff = diffWords("the qui", "the quick brown");
  assert.equal(diff.errors, 0);
  assert.equal(diff.correctChars, "the qui".length);
});

test("a skipped target word is counted once per omitted character", () => {
  const withTrailingSpace = diffWords("one three ", "one two three");
  assert.equal(withTrailingSpace.skippedWords, 1);
  assert.equal(withTrailingSpace.errors, 3);

  // Timer expiry can happen before the final space is entered.
  const withoutTrailingSpace = diffWords("one three", "one two three");
  assert.equal(withoutTrailingSpace.skippedWords, 1);
  assert.equal(withoutTrailingSpace.errors, 3);
});

test("an extra typed word counts its characters as errors", () => {
  const diff = diffWords("one extra two ", "one two");
  assert.equal(diff.errors, 5);
});

test("duplicate spaces are counted as extra input characters", () => {
  const diff = diffWords("one  two ", "one two");
  assert.equal(diff.errors, 1);
});
