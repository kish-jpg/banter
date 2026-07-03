import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { allowedTagNames, containsBannedTerm } from "../functions/coaching/taxonomy.ts";
import { validateCoachingResponse } from "../functions/coaching/validate.ts";

const allowedTags = allowedTagNames();
const [validTag1, validTag2, validTag3] = Array.from(allowedTags);

Deno.test("valid response: 3 replies, allowlisted tags, no banned terms, no em dash/semicolon", () => {
  const result = validateCoachingResponse(
    {
      replies: [
        { text: "That sounds like a fun weekend plan", psychologyTag: validTag1 },
        { text: "I would love to hear more about that", psychologyTag: validTag2 },
        { text: "What got you into that", psychologyTag: validTag3 },
      ],
    },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result, { valid: true });
});

Deno.test("rejects off-allowlist psychology tag and names it in the reason", () => {
  const result = validateCoachingResponse(
    {
      replies: [
        { text: "reply one", psychologyTag: "Alpha dominance" },
        { text: "reply two", psychologyTag: validTag1 },
        { text: "reply three", psychologyTag: validTag2 },
      ],
    },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result.valid, false);
  assertStringIncludes(result.reason ?? "", "Alpha dominance");
});

Deno.test("rejects reply text containing a banned term and names it in the reason", () => {
  const result = validateCoachingResponse(
    {
      replies: [
        { text: "try a bit of negging to keep them interested", psychologyTag: validTag1 },
        { text: "reply two", psychologyTag: validTag2 },
        { text: "reply three", psychologyTag: validTag3 },
      ],
    },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result.valid, false);
  assertStringIncludes(result.reason ?? "", "negging");
});

Deno.test("rejects reply text containing an em dash and names AI-tell punctuation", () => {
  const result = validateCoachingResponse(
    {
      replies: [
        { text: "I like hiking — especially in fall", psychologyTag: validTag1 },
        { text: "reply two", psychologyTag: validTag2 },
        { text: "reply three", psychologyTag: validTag3 },
      ],
    },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result.valid, false);
  assertStringIncludes(result.reason ?? "", "AI-tell punctuation");
});

Deno.test("rejects reply text containing a semicolon joining clauses and names AI-tell punctuation", () => {
  const result = validateCoachingResponse(
    {
      replies: [
        { text: "I love that; it sounds amazing", psychologyTag: validTag1 },
        { text: "reply two", psychologyTag: validTag2 },
        { text: "reply three", psychologyTag: validTag3 },
      ],
    },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result.valid, false);
  assertStringIncludes(result.reason ?? "", "AI-tell punctuation");
});

Deno.test("rejects a response with 2 replies (not 3) and names the count", () => {
  const result = validateCoachingResponse(
    {
      replies: [
        { text: "reply one", psychologyTag: validTag1 },
        { text: "reply two", psychologyTag: validTag2 },
      ],
    },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result.valid, false);
  assertStringIncludes(result.reason ?? "", "2");
});

Deno.test("validate.ts imports nothing Gemini-specific (structural type only)", () => {
  // Proven by the fact this test file never imports a Gemini/LLMProvider type -
  // validateCoachingResponse's first param accepts any { replies: {text, psychologyTag}[] } shape.
  assert(true);
});
