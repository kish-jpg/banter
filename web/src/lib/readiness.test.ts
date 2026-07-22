import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { readinessBand, readinessScore, storiesOwnedRatio } from "./readiness.ts";

function debt(status: "open" | "owned") {
  return {
    id: "x",
    personaId: "p",
    threadId: "t",
    kind: "story" as const,
    owner: "user" as const,
    text: "",
    quote: "",
    status,
    addedAt: 0,
    resolvedAt: null,
  };
}

test("stories owned: empty debt = 1, half owned = 0.5", () => {
  assert.equal(storiesOwnedRatio([]), 1);
  assert.equal(storiesOwnedRatio([debt("owned"), debt("open")]), 0.5);
});

test("readiness blends know-her + own-stories + authenticity, and bands", () => {
  const ready = readinessScore({ factsCold: 0.9, storiesOwned: 1, authenticity: 0.8 });
  assert.equal(readinessBand(ready), "ready");

  const cold = readinessScore({ factsCold: 0, storiesOwned: 0, authenticity: 0 });
  assert.equal(cold, 0);
  assert.equal(readinessBand(cold), "not yet");

  const mid = readinessScore({ factsCold: 0.5, storiesOwned: 0.5, authenticity: 0.5 });
  assert.equal(readinessBand(mid), "getting there");
});

test("authenticity is a real gate: knowing her but chatfishing hard is not ready", () => {
  // knows her cold + owns stories, but chat-you is nothing like real-you
  const chatfishing = readinessScore({ factsCold: 1, storiesOwned: 1, authenticity: 0 });
  assert.ok(chatfishing < 0.75, `authenticity should hold readiness back, got ${chatfishing}`);
  assert.notEqual(readinessBand(chatfishing), "ready");
});

test("inputs are clamped to 0..1", () => {
  const full = readinessScore({ factsCold: 5, storiesOwned: 5, authenticity: 5 });
  assert.ok(full <= 1 && full > 0.999);
});

test("fade series buckets assisted share over time, honest about thin data", async () => {
  // @ts-expect-error node's test runner needs the .ts extension
  const { fadeSeries } = await import("./readiness.ts");
  const DAY = 86_400_000;
  const events = [
    { at: 0, assisted: true },
    { at: 1 * DAY, assisted: true },
    { at: 5 * DAY, assisted: true },
    { at: 6 * DAY, assisted: false },
    { at: 9 * DAY, assisted: false },
    { at: 10 * DAY, assisted: false },
  ];
  const series = fadeSeries(events, 3);
  assert.deepEqual(series, [100, 50, 0]); // the fade, downward
  assert.deepEqual(fadeSeries(events.slice(0, 3)), []); // too thin, no fabricated curve
  assert.deepEqual(fadeSeries(events.map((e) => ({ ...e, at: 5 }))), []); // zero span
});
