import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { landedLabel, responseDelta, scoreMapFor } from "./flywheel.ts";

function read(interest: number, reciprocity: number, warmth: number) {
  return { score: 0, factors: { interest, reciprocity, warmth, responsiveness: 0.5 }, signal: "" };
}

test("responseDelta is positive when they warm up, write more, and ask back", () => {
  const prev = read(0.5, 0.5, 0.5);
  const next = read(0.8, 0.8, 0.8);
  const delta = responseDelta(prev, next, "ok", "that's so cool, tell me everything about it?");
  assert.ok(delta > 0.2, `expected clearly positive, got ${delta}`);
});

test("responseDelta is negative when they cool off and go terse", () => {
  const prev = read(0.7, 0.7, 0.7);
  const next = read(0.4, 0.4, 0.4);
  const delta = responseDelta(prev, next, "haha that's a great story, love it", "k");
  assert.ok(delta < 0, `expected negative, got ${delta}`);
});

test("responseDelta stays bounded in [-1, 1]", () => {
  const hi = responseDelta(read(0, 0, 0), read(1, 1, 1), "x", "x".repeat(500) + "?");
  const lo = responseDelta(read(1, 1, 1), read(0, 0, 0), "x".repeat(500), "x");
  assert.ok(hi <= 1 && lo >= -1);
});

test("scoreMapFor filters to one persona", () => {
  const scores = [
    { factId: "a", personaId: "p1", score: 0.5 },
    { factId: "b", personaId: "p2", score: -0.5 },
  ];
  const map = scoreMapFor(scores, "p1");
  assert.equal(map.get("a"), 0.5);
  assert.equal(map.has("b"), false);
});

test("landedLabel: dead-zone near zero, else landed/flopped", () => {
  assert.equal(landedLabel(undefined), null);
  assert.equal(landedLabel(0.1), null);
  assert.equal(landedLabel(0.5), "landed");
  assert.equal(landedLabel(-0.5), "flopped");
});
