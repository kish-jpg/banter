import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { buildSystemInstruction, formatTranscript } from "../functions/coaching/promptAssembly.ts";
import { taxonomy } from "../functions/coaching/taxonomy.ts";
import type { CoachingResponse, TranscriptEntry } from "../functions/coaching/llm/LLMProvider.ts";

const allowedTags = taxonomy.allowed;

Deno.test("buildSystemInstruction contains every allowlisted tagName and no banned term", () => {
  const instruction = buildSystemInstruction(allowedTags);
  for (const entry of allowedTags) {
    assertStringIncludes(instruction, entry.tagName);
  }
  for (const banned of taxonomy.bannedTerms) {
    assert(
      !instruction.toLowerCase().includes(banned.toLowerCase()),
      `instruction must not contain banned term "${banned}"`,
    );
  }
});

Deno.test("buildSystemInstruction states the five anti-AI-tell directives, mirroring the validator's checks", () => {
  const instruction = buildSystemInstruction(allowedTags).toLowerCase();
  // (1) em dash directive - present without literally embedding the em dash character
  assert(instruction.includes("dash") && !instruction.includes("—"));
  // (2) semicolon-join directive
  assert(instruction.includes("semicolon"));
  // (3) "not just X, but Y" contrast directive
  assert(instruction.includes("not just"));
  // (4) rule-of-three / triadic list directive
  assert(instruction.includes("rule-of-three") || instruction.includes("three parallel items"));
  // (5) edited-not-copied directive
  assert(instruction.includes("edited-not-copied") || instruction.includes("minor imperfections"));
});

Deno.test("buildSystemInstruction biases toward a passed tone; omits any tone line when absent", () => {
  const withTone = buildSystemInstruction(allowedTags, "playful");
  assertStringIncludes(withTone, "playful");

  const withoutTone = buildSystemInstruction(allowedTags);
  assert(!withoutTone.toLowerCase().includes("bias the tone"));
});

Deno.test("formatTranscript sorts by order and emits You:/Match: prefixed lines", () => {
  const transcript: TranscriptEntry[] = [
    { speaker: "match", text: "hey how's it going", order: 1 },
    { speaker: "user", text: "hi there", order: 0 },
    { speaker: "user", text: "good, you?", order: 2 },
  ];

  const formatted = formatTranscript(transcript);
  assertEquals(
    formatted,
    "You: hi there\nMatch: hey how's it going\nYou: good, you?",
  );
});

Deno.test("CoachingResponse shape type-checks: replies (text/psychologyTag/style, no confidence) + locked sentiment shape", () => {
  const sample: CoachingResponse = {
    replies: [
      { text: "haha same", psychologyTag: "Turning toward a bid", style: "playful" },
      { text: "that's fair", psychologyTag: "Reflective validation", style: "sincere" },
      { text: "tell me more", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
    ],
    sentiment: {
      score: 0.7,
      factors: { interest: 0.6, reciprocity: 0.5, warmth: 0.8, responsiveness: 0.7 },
      signal: "warming up",
    },
  };

  assertEquals(sample.replies.length, 3);
  assertEquals(Object.keys(sample.sentiment.factors).sort(), [
    "interest",
    "reciprocity",
    "responsiveness",
    "warmth",
  ]);
  // deliberately no confidence field present anywhere in replies
  for (const reply of sample.replies) {
    assert(!("confidence" in reply));
  }
});
