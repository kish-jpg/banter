import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { analyzePace, paceContextLine, timingWatchOut } from "./timing.ts";

const T0 = 1_800_000_000_000;
const MIN = 60_000;

function msg(speaker: "user" | "match", order: number, tsMin?: number) {
  return { speaker, text: `m${order}`, order, ...(tsMin !== undefined ? { ts: T0 + tsMin * MIN } : {}) };
}

test("computes per-side median response gaps", () => {
  const pace = analyzePace([
    msg("match", 0, 0),
    msg("user", 1, 1), // user replies in 1min
    msg("match", 2, 61), // match replies in 60min
    msg("user", 3, 62),
    msg("match", 4, 122),
  ]);
  assert.equal(Math.round(pace.userMedianMin!), 1);
  assert.equal(Math.round(pace.matchMedianMin!), 60);
});

test("detects cooling trend when match latency stretches", () => {
  const pace = analyzePace([
    msg("user", 0, 0),
    msg("match", 1, 5),
    msg("user", 2, 6),
    msg("match", 3, 16),
    msg("user", 4, 17),
    msg("match", 5, 200),
    msg("user", 6, 201),
    msg("match", 7, 500),
  ]);
  assert.equal(pace.trend, "cooling");
});

test("counts user double-texts (same speaker, 20+ min gap)", () => {
  const pace = analyzePace([
    msg("user", 0, 0),
    msg("user", 1, 30),
    msg("user", 2, 90),
    msg("match", 3, 100),
  ]);
  assert.equal(pace.userDoubleTexts, 2);
});

test("no timestamps -> nulls, no crash, no watch-out at daytime", () => {
  const pace = analyzePace([msg("user", 0), msg("match", 1)]);
  assert.equal(pace.userMedianMin, null);
  assert.equal(pace.trend, null);
  assert.equal(timingWatchOut(pace, new Date("2026-07-10T14:00:00")), null);
});

test("asymmetry watch-out mirrors pace without advising fake distance", () => {
  const pace = analyzePace([
    msg("match", 0, 0),
    msg("user", 1, 1),
    msg("match", 2, 121),
    msg("user", 3, 122),
    msg("match", 4, 300),
  ]);
  const note = timingWatchOut(pace, new Date("2026-07-10T14:00:00"))!;
  assert.ok(note.includes("match the conversation's natural pace"));
  assert.ok(!/wait|hold off|seem busy/i.test(note));
});

test("late-night context lands in the pace line", () => {
  const pace = analyzePace([msg("user", 0), msg("match", 1)]);
  const line = paceContextLine(pace, new Date("2026-07-10T23:30:00"));
  assert.ok(line !== null && line.includes("late night"));
});
