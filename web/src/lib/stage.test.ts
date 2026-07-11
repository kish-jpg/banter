import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { band, cadenceFor, needsOwnAttemptFirst, shouldWalkAway, stageFor } from "./stage.ts";

function sentiment(interest: number, reciprocity: number, warmth = 0.7, responsiveness = 0.7) {
  return { score: interest, factors: { interest, reciprocity, warmth, responsiveness }, signal: "" };
}

test("stage progresses opening -> rapport -> momentum with count and signal", () => {
  assert.equal(stageFor(3, []), "opening");
  assert.equal(stageFor(10, [sentiment(0.6, 0.6)]), "rapport");
  assert.equal(stageFor(14, [sentiment(0.85, 0.8)]), "momentum");
});

test("depth needs length AND sustained warmth", () => {
  assert.equal(stageFor(24, [sentiment(0.6, 0.6, 0.7)]), "depth");
  assert.equal(stageFor(24, [sentiment(0.6, 0.3, 0.3)]), "rapport");
});

test("walk-away fires on two consecutive weak, non-recovering reads only", () => {
  assert.equal(shouldWalkAway([sentiment(0.4, 0.4), sentiment(0.3, 0.35)]), true);
  assert.equal(shouldWalkAway([sentiment(0.3, 0.3), sentiment(0.6, 0.6)]), false);
  assert.equal(shouldWalkAway([sentiment(0.3, 0.3)]), false);
});

test("cadence fades with level: 5 for beginners, floor of 2", () => {
  assert.equal(cadenceFor(1), 5);
  assert.equal(cadenceFor(3), 4);
  assert.equal(cadenceFor(9), 2);
  assert.equal(cadenceFor(20), 2);
  assert.equal(needsOwnAttemptFirst(5, 1), true);
  assert.equal(needsOwnAttemptFirst(4, 1), false);
});

test("bands: low / warming / strong", () => {
  assert.equal(band(0.3), "low");
  assert.equal(band(0.6), "warming");
  assert.equal(band(0.9), "strong");
});
