import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { checkDraft } from "./draft.ts";

const BANNED = ["negging", "scarcity", "push-pull", "neg"];

function kinds(text: string) {
  return checkDraft(text, BANNED).map((c) => c.kind);
}

test("clean drafts pass silently", () => {
  assert.deepEqual(kinds("That hike sounds great, I'm keen for Saturday"), []);
  assert.deepEqual(kinds("How was the clinic today?"), []);
});

test("prize-framing is caught (the case-study final message)", () => {
  assert.deepEqual(kinds("my best positions are never posted, they're earned"), ["frame"]);
  assert.ok(kinds("you'd be lucky to get me").includes("frame"));
  assert.ok(kinds("prove yourself first").includes("frame"));
});

test("frame patterns don't fire on ordinary uses", () => {
  assert.deepEqual(kinds("I earned my degree last year"), []);
  assert.deepEqual(kinds("lucky we both hate mornings"), []);
});

test("question stacking: two ?-groups flag, ?? counts once", () => {
  assert.deepEqual(kinds("How was work? Did you see Ruby? "), ["stacking"]);
  assert.deepEqual(kinds("wait, you did WHAT??"), []);
});

test("banned manipulation vocabulary is flagged", () => {
  assert.deepEqual(kinds("classic negging works every time"), ["banned"]);
});

test("AI-tell punctuation: em-dash, semicolon-join", () => {
  assert.deepEqual(kinds("Sounds fun — count me in"), ["ai-tell"]);
  assert.deepEqual(kinds("I love that; we should go"), ["ai-tell"]);
  assert.deepEqual(kinds("smiley ;) is fine"), []);
});
