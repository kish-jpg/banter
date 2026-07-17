import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { applyAnswer, dueCards, quizMastery, INTERVAL_DAYS } from "./quiz.ts";

const DAY = 86_400_000;

function fact(id: string) {
  return {
    id,
    type: "logistics" as const,
    text: `fact ${id}`,
    quote: "",
    source: "conversation" as const,
    addedAt: 0,
    timesUsed: 0,
    lastUsedAt: null,
  };
}

test("new facts are due immediately, capped at k", () => {
  const facts = ["a", "b", "c", "d", "e", "f", "g"].map(fact);
  const due = dueCards(facts, [], 1000, 5);
  assert.equal(due.length, 5);
});

test("knew-it climbs boxes with the 1/3/7/14 ladder; miss resets to box 0", () => {
  const f = fact("a");
  let states = applyAnswer([], f, "p1", true, 0);
  assert.equal(states[0].box, 0);
  assert.equal(states[0].due, INTERVAL_DAYS[0] * DAY);

  states = applyAnswer(states, f, "p1", true, 1 * DAY);
  assert.equal(states[0].box, 1);
  assert.equal(states[0].due, 1 * DAY + INTERVAL_DAYS[1] * DAY);

  states = applyAnswer(states, f, "p1", true, 4 * DAY);
  states = applyAnswer(states, f, "p1", true, 11 * DAY);
  assert.equal(states[0].box, 3);

  // box is capped at the top interval
  states = applyAnswer(states, f, "p1", true, 25 * DAY);
  assert.equal(states[0].box, 3);

  states = applyAnswer(states, f, "p1", false, 40 * DAY);
  assert.equal(states[0].box, 0);
  assert.equal(states[0].lapses, 1);
});

test("reviewed facts only come due after their interval; overdue sorts before new", () => {
  const a = fact("a");
  const b = fact("b");
  const states = applyAnswer([], a, "p1", true, 0); // due at day 1
  assert.deepEqual(
    dueCards([a, b], states, 0.5 * DAY).map((f) => f.id),
    ["b"], // a not due yet, b never drilled
  );
  assert.deepEqual(
    dueCards([a, b], states, 1.5 * DAY).map((f) => f.id),
    ["a", "b"], // overdue review first
  );
});

test("mastery = fraction of facts held at box 2+", () => {
  const a = fact("a");
  const b = fact("b");
  let states = applyAnswer([], a, "p1", true, 0);
  states = applyAnswer(states, a, "p1", true, 1 * DAY);
  states = applyAnswer(states, a, "p1", true, 4 * DAY); // box 2
  assert.equal(quizMastery([a, b], states), 0.5);
  assert.equal(quizMastery([], states), 0);
});
