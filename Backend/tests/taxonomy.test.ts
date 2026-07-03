import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert@1";
import { allowedTagNames, containsBannedTerm, taxonomy } from "../functions/coaching/taxonomy.ts";

Deno.test("taxonomy.json parses into the Taxonomy shape with non-empty allowed[] and bannedTerms[]", () => {
  assert(Array.isArray(taxonomy.allowed) && taxonomy.allowed.length > 0);
  assert(Array.isArray(taxonomy.bannedTerms) && taxonomy.bannedTerms.length > 0);
});

Deno.test("every allowed[] entry has non-empty framework, technique, tagName, explanation, citation", () => {
  for (const entry of taxonomy.allowed) {
    assert(entry.framework.length > 0);
    assert(entry.technique.length > 0);
    assert(entry.tagName.length > 0);
    assert(entry.explanation.length > 0);
    assert(entry.citation.length > 0);
  }
});

Deno.test("allowedTagNames() returns a Set containing every allowed[].tagName and nothing else", () => {
  const tags = allowedTagNames();
  assertEquals(tags.size, taxonomy.allowed.length);
  for (const entry of taxonomy.allowed) {
    assert(tags.has(entry.tagName));
  }
});

Deno.test("containsBannedTerm detects a banned term case-insensitively and returns null otherwise", () => {
  assertStrictEquals(containsBannedTerm("this is negging"), "negging");
  assertStrictEquals(containsBannedTerm("this is NEGGING behavior"), "negging");
  assertStrictEquals(containsBannedTerm("a normal reply"), null);
});

Deno.test("containsBannedTerm uses word boundaries, not substring - 'neg' doesn't false-positive on 'negotiating'/'negative' (WR-01)", () => {
  assertStrictEquals(containsBannedTerm("negotiating a good time to meet"), null);
  assertStrictEquals(containsBannedTerm("I feel like I'm in the negative about this"), null);
  assertStrictEquals(containsBannedTerm("that took a lot of energy"), null);
  assertStrictEquals(containsBannedTerm("just say neg and see what happens"), "neg");
});

Deno.test("allowlist covers Gottman + attachment + Aron; banlist covers negging/scarcity/alpha", () => {
  const frameworks = taxonomy.allowed.map((e) => e.framework.toLowerCase());
  assert(frameworks.some((f) => f.includes("gottman")));
  assert(frameworks.some((f) => f.includes("attachment")));
  assert(frameworks.some((f) => f.includes("aron")));

  const banned = taxonomy.bannedTerms.map((t) => t.toLowerCase());
  assert(banned.includes("negging"));
  assert(banned.includes("scarcity"));
  assert(banned.some((t) => t.includes("alpha")));
});
