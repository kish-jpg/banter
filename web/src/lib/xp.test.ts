import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { attemptXP, copyXP, isNearDuplicate, levelFor, similarity } from "./xp.ts";

test("verbatim paste of a suggestion is a near-duplicate", () => {
  const s = "Haha absolutely I screamed. like a banshee. what about you?";
  assert.equal(isNearDuplicate(s, [s]), true);
});

test("light word-swap of a suggestion is still a near-duplicate", () => {
  assert.equal(
    isNearDuplicate(
      "Haha absolutely I screamed. like a banshee. how about you?",
      ["Haha absolutely I screamed. like a banshee. what about you?"],
    ),
    true,
  );
});

test("a genuinely different attempt is not a near-duplicate", () => {
  assert.equal(
    isNearDuplicate(
      "worth every second of terror honestly. you strike me as a skydiver, am I right?",
      ["Haha absolutely I screamed. like a banshee. what about you?"],
    ),
    false,
  );
});

test("own attempt XP always beats copy XP, and scales with grade", () => {
  assert.ok(attemptXP(1, false) > copyXP());
  assert.ok(attemptXP(5, false) > attemptXP(3, false));
  assert.equal(attemptXP(5, true), copyXP());
});

test("levels accumulate: 0 XP is level 1, thresholds move up 100/150/200", () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(99).level, 1);
  assert.equal(levelFor(100).level, 2);
  assert.equal(levelFor(250).level, 3);
});

test("similarity is symmetric-ish sanity", () => {
  assert.equal(similarity("", "anything"), 0);
  assert.ok(similarity("hello there", "hello there") === 1);
});
