import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { computeLocks } from "./resonance.ts";

function selfFact(text: string, quote: string) {
  return {
    id: crypto.randomUUID(),
    personaId: "p1",
    type: "values" as const,
    text,
    quote,
    source: "conversation" as const,
    addedAt: 0,
  };
}

function matchFact(text: string, quote: string) {
  return {
    id: crypto.randomUUID(),
    type: "values" as const,
    text,
    quote,
    source: "conversation" as const,
    addedAt: 0,
    timesUsed: 0,
    lastUsedAt: null,
  };
}

test("rare traits outweigh generic overlaps (two non-drinkers > two music likers)", () => {
  const self = [
    selfFact("stopped drinking as a challenge, kept it", "I decided to stop drinking"),
    selfFact("loves indie music gigs live", "I love indie music gigs"),
  ];
  const match = [
    matchFact("lifetime non-drinker, family experience", "I don't drink at all"),
    matchFact("enjoys indie music gigs sometimes", "indie music gigs are fun"),
  ];
  const locks = computeLocks(self, match);
  assert.ok(locks.length >= 2, `expected 2+ locks, got ${locks.length}`);
  assert.match(locks[0].label, /drink/i);
  assert.equal(locks[0].tag, "rare");
});

test("every lock carries both quotes — no quote, still traceable to stated words", () => {
  const self = [selfFact("proud overthinker, always in his head", "I'm definitely a bit of an overthinker")];
  const match = [matchFact("self-described overthinker who worries", "I overthink, i worry a lot")];
  const locks = computeLocks(self, match);
  assert.equal(locks.length, 1);
  assert.ok(locks[0].selfQuote.length > 0);
  assert.ok(locks[0].matchQuote.length > 0);
});

test("single-word generic overlap does not fabricate a lock", () => {
  const self = [selfFact("works long days in the city", "long day in the city")];
  const match = [matchFact("had a long shift at the clinic", "such a long shift")];
  // only shared generic word is "long" — not enough
  assert.equal(computeLocks(self, match).length, 0);
});
