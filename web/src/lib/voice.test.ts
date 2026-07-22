import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { authenticity, authenticityBand, divergence, fingerprint, gapNudge, reliance } from "./voice.ts";

test("cold start: fewer than 3 messages returns null", () => {
  assert.equal(fingerprint([]), null);
  assert.equal(fingerprint(["hey", "sup"]), null);
  assert.ok(fingerprint(["hey", "sup", "how are you"]));
});

test("playful voice scores high on playful, earnest scores low", () => {
  const playfulFp = fingerprint(["haha stop 😭", "okay that's unhinged lol", "no wayyy 🤣"])!;
  const earnestFp = fingerprint([
    "That means a lot to me.",
    "I really appreciate you saying that.",
    "I feel the same way honestly.",
  ])!;
  assert.ok(playfulFp.playful > earnestFp.playful);
});

test("elaborate voice scores high, terse voice scores low", () => {
  const longFp = fingerprint([
    "I think the thing that really gets me about that whole situation is how nobody actually said what they meant",
    "It reminds me of this time last year when the exact same dynamic played out at my old job honestly",
    "Anyway the point is that people avoid the real conversation almost every single time and it drives me up the wall",
  ])!;
  const terseFp = fingerprint(["ha same", "for real", "so true"])!;
  assert.ok(longFp.elaborate > terseFp.elaborate + 0.3);
});

test("question-heavy voice reads curious (low declarative)", () => {
  const curiousFp = fingerprint(["wait what happened?", "and then what did you say?", "how did that feel?"])!;
  const declarativeFp = fingerprint(["that sounds rough.", "I would have left.", "people are the worst."])!;
  assert.ok(curiousFp.declarative < declarativeFp.declarative);
});

test("edited prose reads polished; lowercase casual reads spontaneous", () => {
  const polishedFp = fingerprint([
    "That is a genuinely wonderful idea.",
    "I would love to hear more about it.",
    "Let me know what works best for you.",
  ])!;
  const casualFp = fingerprint(["ok that's kinda genius", "i'd def be down", "lemme know whenever"])!;
  assert.ok(polishedFp.polished > casualFp.polished);
});

test("divergence: identical voices ~0, opposite voices large; authenticity is its complement", () => {
  const a = { playful: 0.8, elaborate: 0.2, declarative: 0.3, polished: 0.2 };
  const b = { playful: 0.2, elaborate: 0.9, declarative: 0.9, polished: 0.9 };
  assert.equal(divergence(a, a), 0);
  assert.equal(authenticity(a, a), 1);
  assert.ok(divergence(a, b) > 0.4);
  assert.ok(authenticity(a, b) < 0.6);
});

test("gapNudge names the widest gap and its direction; null when close", () => {
  const real = { playful: 0.6, elaborate: 0.2, declarative: 0.3, polished: 0.3 };
  const chatElaborate = { playful: 0.6, elaborate: 0.85, declarative: 0.3, polished: 0.35 };
  assert.match(gapNudge(real, chatElaborate) ?? "", /elaborate|long-winded/i);
  assert.equal(gapNudge(real, { ...real }), null);
});

test("bands and reliance", () => {
  assert.equal(authenticityBand(0.3), "not yet");
  assert.equal(authenticityBand(0.6), "getting there");
  assert.equal(authenticityBand(0.85), "this is you");
  assert.equal(reliance(0, 0), 0);
  assert.equal(reliance(3, 1), 0.75);
});
