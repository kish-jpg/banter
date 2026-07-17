import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error node's test runner needs the .ts extension; Next's tsc config disallows it
import { archetypeFor } from "./dna.ts";

test("top two dims pick the archetype, lowest picks the growth edge", () => {
  const a = archetypeFor({ warmth: 4.5, specificity: 4.0, reciprocity: 3.0, naturalness: 2.5 });
  assert.equal(a.name, "The Rememberer");
  assert.equal(a.growth, "less polish, more you");
  assert.equal(a.strengths.length, 2);
});

test("the Tamsyn-corpus profile lands on a naturalness growth edge", () => {
  // warmth 4.5 · specificity 4.5 · reciprocity 4.0 · naturalness 3.5 (case study §4)
  const a = archetypeFor({ warmth: 4.5, specificity: 4.5, reciprocity: 4.0, naturalness: 3.5 });
  assert.equal(a.name, "The Rememberer");
  assert.equal(a.growth, "less polish, more you");
});

test("every top/second combination resolves to a named archetype", () => {
  const dims = ["warmth", "specificity", "reciprocity", "naturalness"] as const;
  for (const top of dims) {
    for (const second of dims) {
      if (top === second) continue;
      const dna = { warmth: 1, specificity: 1, reciprocity: 1, naturalness: 1 };
      dna[top] = 5;
      dna[second] = 4;
      const a = archetypeFor(dna);
      assert.ok(a.name.length > 0, `${top}/${second} has no name`);
      assert.ok(a.tagline.length > 0);
    }
  }
});
