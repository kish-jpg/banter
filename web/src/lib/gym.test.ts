import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { collectMoments, drillDoneToday, generateDrill, gymStreak, gymXP, weakestDim } from "./gym.ts";

const DAY = 86_400_000;

function thread(id: string, texts: [("user" | "match"), string][]) {
  return {
    id,
    label: id,
    messages: texts.map(([speaker, text], i) => ({ speaker, text, order: i })),
    lastCoaching: null,
    updatedAt: 0,
  };
}

const DNA = { warmth: 4.5, specificity: 4.0, reciprocity: 3.5, naturalness: 2.8 };

test("weakestDim picks the lowest-scoring dimension", () => {
  assert.equal(weakestDim(DNA), "naturalness");
  assert.equal(weakestDim({ warmth: 2, specificity: 4, reciprocity: 4, naturalness: 4 }), "warmth");
});

test("collectMoments gathers match messages, drops short ones and dupes", () => {
  const threads = [
    thread("a", [["match", "how was your weekend, do anything fun?"], ["user", "not much"], ["match", "hi"]]),
    thread("b", [["match", "how was your weekend, do anything fun?"], ["match", "tell me about the hike you mentioned"]]),
  ];
  const moments = collectMoments(threads);
  assert.equal(moments.length, 2); // "hi" dropped (too short), the weekend line deduped
  assert.ok(moments.every((m) => m.length >= 16));
});

test("generateDrill targets the weakest dim, rotates, and is null without data", () => {
  const threads = [thread("a", [["match", "tell me about the hike you mentioned last week"]])];
  const d0 = generateDrill(threads, DNA, 0);
  assert.ok(d0);
  assert.equal(d0.dim, "naturalness");
  const d1 = generateDrill(threads, DNA, 1);
  assert.ok(d1);
  assert.notEqual(d0.constraint.id, d1.constraint.id); // rotates constraints
  assert.equal(generateDrill(threads, null, 0), null); // no DNA yet
  assert.equal(generateDrill([], DNA, 0), null); // no moments
});

test("no-question constraint check rejects a reply containing '?'", () => {
  const threads = [thread("a", [["match", "guess what happened at work today, so wild"]])];
  const d = generateDrill(threads, DNA, 0); // naturalness -> no-question first
  assert.ok(d);
  assert.equal(d.constraint.id, "no-question");
  assert.equal(d.constraint.check?.("that's amazing, tell me more?"), false);
  assert.equal(d.constraint.check?.("that's genuinely amazing"), true);
});

test("daily cap and streak", () => {
  const now = 10 * DAY;
  const drills = [
    { id: "1", at: 8 * DAY, momentText: "", constraintId: "", dim: "warmth" as const, grade: 4 },
    { id: "2", at: 9 * DAY, momentText: "", constraintId: "", dim: "warmth" as const, grade: 4 },
    { id: "3", at: 10 * DAY, momentText: "", constraintId: "", dim: "warmth" as const, grade: 4 },
  ];
  assert.equal(drillDoneToday(drills, now), true);
  assert.equal(drillDoneToday(drills, 11 * DAY), false);
  assert.equal(gymStreak(drills, now), 3);
});

test("gym XP is 8, rising to 12 at a 7-day streak, always below own-attempt max", () => {
  assert.equal(gymXP(1), 8);
  assert.equal(gymXP(6), 8);
  assert.equal(gymXP(7), 12);
  assert.ok(gymXP(30) < 40); // never outfarms a real own attempt (8..40)
});
