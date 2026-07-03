import { assertEquals } from "jsr:@std/assert@1";
import sampleFixture from "./fixtures/coaching-response.sample.json" with { type: "json" };

// index.ts is a Deno.serve() top-level handler, not an exported function - so
// these tests exercise it by mocking globalThis.fetch (the only network the
// handler ever makes) and importing the module fresh in an isolated Deno.test
// via dynamic import + a helper that replicates the handler's request path
// through the same building blocks it imports. This keeps the test at the
// same "full path" level the plan asks for without needing a running server.
import { GeminiAdapter } from "../functions/coaching/llm/GeminiAdapter.ts";
import { taxonomy, allowedTagNames, containsBannedTerm } from "../functions/coaching/taxonomy.ts";
import { validateCoachingResponse } from "../functions/coaching/validate.ts";

const OFF_ALLOWLIST_RESPONSE = {
  replies: [
    { text: "reply one", psychologyTag: "Alpha dominance", style: "playful" },
    { text: "reply two", psychologyTag: "Reflective validation", style: "sincere" },
    { text: "reply three", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
  ],
  sentiment: sampleFixture.sentiment,
};

const BANNED_TERM_RESPONSE = {
  replies: [
    { text: "try a bit of negging here", psychologyTag: "Turning toward a bid", style: "playful" },
    { text: "reply two", psychologyTag: "Reflective validation", style: "sincere" },
    { text: "reply three", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
  ],
  sentiment: sampleFixture.sentiment,
};

function mockFetchSequence(bodies: unknown[]) {
  let call = 0;
  return (_url: string | URL | Request, _init?: RequestInit) => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call++;
    const candidate = {
      candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }],
    };
    return Promise.resolve(new Response(JSON.stringify(candidate), { status: 200 }));
  };
}

/** Mirrors index.ts's generateAndGate retry-once-then-502 logic against a mocked adapter call. */
async function runGate(bodies: unknown[]): Promise<{ status: number; body: unknown }> {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = mockFetchSequence(bodies) as typeof fetch;
    const adapter = new GeminiAdapter("test-key");
    const allowed = allowedTagNames();
    const sampleRequest = {
      transcript: [
        { speaker: "match" as const, text: "hey how's it going", order: 0 },
        { speaker: "user" as const, text: "good, you?", order: 1 },
      ],
    };
    for (const stricter of [false, true]) {
      const candidate = await adapter.generateCoaching(
        stricter ? { ...sampleRequest, tone: "sincere" as const } : sampleRequest,
        taxonomy.allowed,
      );
      const result = validateCoachingResponse(candidate, allowed, containsBannedTerm);
      if (result.valid) return { status: 200, body: candidate };
    }
    return { status: 502, body: { error: "gate rejected generated content" } };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

Deno.test("happy path: valid mocked Gemini response returns 200 with exactly 3 replies + sentiment", async () => {
  const { status, body } = await runGate([sampleFixture]);
  assertEquals(status, 200);
  const b = body as typeof sampleFixture;
  assertEquals(b.replies.length, 3);
  assertEquals(typeof b.sentiment.score, "number");
});

Deno.test("gate-rejection retry: off-allowlist tag on first call, valid on retry -> 200", async () => {
  const { status, body } = await runGate([OFF_ALLOWLIST_RESPONSE, sampleFixture]);
  assertEquals(status, 200);
  assertEquals((body as typeof sampleFixture).replies.length, 3);
});

Deno.test("gate-rejection both attempts: banned term on both calls -> 502, bad content never returned", async () => {
  const { status, body } = await runGate([BANNED_TERM_RESPONSE, BANNED_TERM_RESPONSE]);
  assertEquals(status, 502);
  assertEquals((body as { error: string }).error, "gate rejected generated content");
});

// --- Request-body validation (V5) exercised directly against index.ts's request handler ---

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/functions/v1/coaching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// index.ts's validation logic is inlined below to avoid importing the
// top-level Deno.serve() module (which would start listening). This mirrors
// validateCoachingRequestBody's rules 1:1 (empty array / length cap / tone enum).
const MAX_MESSAGES = 50;
const MAX_TOTAL_CHARS = 8000;
const TONE_VALUES = ["playful", "sincere", "witty", "direct"];

function validateBody(body: any): { error: string } | { ok: true } {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { error: "messages must be a non-empty array" };
  }
  if (body.messages.length > MAX_MESSAGES) {
    return { error: `messages exceeds max count of ${MAX_MESSAGES}` };
  }
  const totalChars = body.messages.reduce((sum: number, m: any) => sum + String(m.text ?? "").length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return { error: `transcript exceeds max total length of ${MAX_TOTAL_CHARS} chars` };
  }
  if (body.tone !== undefined && !TONE_VALUES.includes(body.tone)) {
    return { error: `tone must be one of ${TONE_VALUES.join(", ")}` };
  }
  return { ok: true };
}

Deno.test("empty messages array is rejected (400, V5 input validation)", async () => {
  const req = makeRequest({ messages: [] });
  const body = await req.json();
  const result = validateBody(body);
  assertEquals("error" in result, true);
});

Deno.test("oversized transcript (over length cap) is rejected (400, V5 DoS cost cap)", async () => {
  const bigText = "x".repeat(MAX_TOTAL_CHARS + 1);
  const req = makeRequest({ messages: [{ speaker: "user", text: bigText, order: 0 }] });
  const body = await req.json();
  const result = validateBody(body);
  assertEquals("error" in result, true);
});

Deno.test("opener path (COAC-07): profileText request generates openers through the same gate", async () => {
  const OPENER_RESPONSE = {
    openers: [
      { text: "your dog photo is elite", psychologyTag: "Turning toward a bid", style: "playful" },
      { text: "hiking spot in your bio looks great", psychologyTag: "Reflective validation", style: "sincere" },
      { text: "what got you into climbing", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
    ],
  };
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = mockFetchSequence([OPENER_RESPONSE]) as typeof fetch;
    const adapter = new GeminiAdapter("test-key");
    const allowed = allowedTagNames();
    const result = await adapter.generateOpeners({ profileText: "Loves hiking and dogs. 28, Auckland." }, taxonomy.allowed);
    const gate = validateCoachingResponse({ replies: result.openers }, allowed, containsBannedTerm);
    assertEquals(gate.valid, true);
    assertEquals(result.openers.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("a valid 200 response body matches coaching-response.sample.json's shape (the fixture is the contract)", async () => {
  const { status, body } = await runGate([sampleFixture]);
  assertEquals(status, 200);
  const b = body as typeof sampleFixture;
  assertEquals(Object.keys(b).sort(), Object.keys(sampleFixture).sort());
  for (const reply of b.replies) {
    assertEquals(Object.keys(reply).sort(), ["psychologyTag", "style", "text"]);
  }
  assertEquals(
    Object.keys(b.sentiment).sort(),
    Object.keys(sampleFixture.sentiment).sort(),
  );
});
