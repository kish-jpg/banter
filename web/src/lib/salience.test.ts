import { test } from "node:test";
// R3 bucket weights are exercised at the bottom of this file.
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { noveltyWeight, recencyWeight, relevance, selectFacts } from "./salience.ts";

const NOW = 1_800_000_000_000;

function fact(over: Record<string, unknown>) {
  return {
    id: "f1",
    type: "interest" as const,
    text: "loves bouldering",
    quote: "I basically live at the climbing gym",
    source: "conversation" as const,
    addedAt: NOW,
    timesUsed: 0,
    lastUsedAt: null,
    ...over,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const msgs = (texts: string[]) =>
  texts.map((text, order) => ({ speaker: "match" as const, text, order }));

test("relevance rewards keyword overlap with recent messages", () => {
  const f = fact({});
  const on = relevance(f, msgs(["went climbing this weekend, arms are dead"]));
  const off = relevance(f, msgs(["what's your favourite pizza topping"]));
  assert.ok(on > off);
});

test("novelty buries overused facts: 2 uses cuts weight 5x", () => {
  assert.equal(noveltyWeight(fact({ timesUsed: 0 })), 1);
  assert.ok(noveltyWeight(fact({ timesUsed: 2 })) <= 0.2);
});

test("recency decays conversation facts but never manual ones", () => {
  const old = NOW - 28 * 86_400_000; // 4 weeks = two half-lives
  assert.ok(recencyWeight(fact({ addedAt: old }), NOW) < 0.3);
  assert.equal(recencyWeight(fact({ addedAt: old, source: "manual" }), NOW), 1);
});

test("selectFacts returns top-k and prefers stage-appropriate types", () => {
  const hook = fact({ id: "hook", type: "hook", text: "profile photo at a jazz bar" });
  const logistics = fact({ id: "log", type: "logistics", text: "free on weekends" });
  const opening = selectFacts([hook, logistics], msgs(["hey there"]), "opening", NOW, 1);
  const momentum = selectFacts([hook, logistics], msgs(["hey there"]), "momentum", NOW, 1);
  assert.equal(opening[0].id, "hook");
  assert.equal(momentum[0].id, "log");
});

test("an overused relevant fact loses to a fresh stage-appropriate one", () => {
  const wornOut = fact({ id: "worn", timesUsed: 3, text: "has a dog named Biscuit", quote: "" });
  const freshFact = fact({ id: "fresh", text: "training for a half marathon", quote: "" });
  const picked = selectFacts([wornOut, freshFact], msgs(["how was the dog park"]), "rapport", NOW, 1);
  assert.equal(picked[0].id, "fresh");
});

test("R3 buckets: style is never injected; food carries rapport; values peak at depth", () => {
  const style = fact({ id: "style", type: "style", text: "morning texter, short messages" });
  const food = fact({ id: "food", type: "food", text: "iced mocha, 2/3 chocolate, whipped cream" });
  const values = fact({ id: "values", type: "values", text: "hates half-truths, honesty first" });
  const rapport = selectFacts([style, food], msgs(["what should we grab"]), "rapport", NOW, 2);
  assert.ok(!rapport.some((f) => f.id === "style"), "style must never surface");
  assert.equal(rapport[0].id, "food");
  const depth = selectFacts([food, values], msgs(["being real with you"]), "depth", NOW, 1);
  assert.equal(depth[0].id, "values");
});

test("R3 buckets: open questions fuel the opening, fade by momentum", () => {
  const oq = fact({ id: "oq", type: "open-question", text: "still unknown: her music taste" });
  const logistics = fact({ id: "log2", type: "logistics", text: "off Mondays" });
  const opening = selectFacts([oq, logistics], msgs(["hi"]), "opening", NOW, 1);
  const momentum = selectFacts([oq, logistics], msgs(["hi"]), "momentum", NOW, 1);
  assert.equal(opening[0].id, "oq");
  assert.equal(momentum[0].id, "log2");
});

test("flywheel boost: a landed fact outranks an equal one, a flopped fact sinks", () => {
  const a = fact({ id: "a", text: "loves rock climbing on weekends", quote: "" });
  const b = fact({ id: "b", text: "loves rock climbing on weekends", quote: "" });
  const boosted = new Map([["a", 2]]); // a landed well before
  const picked = selectFacts([a, b], msgs(["what are you into"]), "rapport", NOW, 1, boosted);
  assert.equal(picked[0].id, "a");

  const c = fact({ id: "c", text: "training for a half marathon", quote: "" });
  const d = fact({ id: "d", text: "training for a half marathon", quote: "" });
  const demoted = new Map([["c", -3]]); // c flopped repeatedly
  const picked2 = selectFacts([c, d], msgs(["how's the running"]), "rapport", NOW, 1, demoted);
  assert.equal(picked2[0].id, "d"); // the un-flopped one wins
});
