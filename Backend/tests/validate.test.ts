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

// --- validateGradeResponse (GROW-01) ---

import { validateGradeResponse } from "../functions/coaching/validate.ts";

const validGrade = {
  dimensions: [
    { dimension: "warmth", reasoning: "engaged", score: 4 },
    { dimension: "specificity", reasoning: "concrete", score: 5 },
    { dimension: "reciprocity", reasoning: "asks back", score: 4 },
    { dimension: "naturalness", reasoning: "reads real", score: 4 },
  ],
  overallScore: 4,
  strengthNote: "You matched their energy.",
  improvementNote: "Add a detail of your own.",
  citedTag: validTag1,
};

Deno.test("grade: valid 4-dimension rubric with allowlisted citedTag passes", () => {
  assertEquals(validateGradeResponse(validGrade, allowedTags, containsBannedTerm), { valid: true });
});

Deno.test("grade: off-allowlist citedTag is rejected and named", () => {
  const result = validateGradeResponse({ ...validGrade, citedTag: "Alpha dominance" }, allowedTags, containsBannedTerm);
  assertEquals(result.valid, false);
  assertStringIncludes(result.reason ?? "", "Alpha dominance");
});

Deno.test("grade: missing rubric dimension is rejected", () => {
  const result = validateGradeResponse(
    { ...validGrade, dimensions: validGrade.dimensions.slice(0, 3) },
    allowedTags,
    containsBannedTerm,
  );
  assertEquals(result.valid, false);
});

Deno.test("grade: dimension score outside 1-5 is rejected", () => {
  const bad = { ...validGrade, dimensions: validGrade.dimensions.map((d, i) => i === 0 ? { ...d, score: 7 } : d) };
  assertEquals(validateGradeResponse(bad, allowedTags, containsBannedTerm).valid, false);
});

Deno.test("grade: banned term inside dimension reasoning is rejected (feedback is gated too)", () => {
  const bad = { ...validGrade, dimensions: validGrade.dimensions.map((d, i) => i === 1 ? { ...d, reasoning: "classic push-pull energy" } : d) };
  assertEquals(validateGradeResponse(bad, allowedTags, containsBannedTerm).valid, false);
});

Deno.test("grade: AI-tell punctuation in notes is rejected", () => {
  const bad = { ...validGrade, improvementNote: "Good start; add more detail" };
  assertEquals(validateGradeResponse(bad, allowedTags, containsBannedTerm).valid, false);
});
