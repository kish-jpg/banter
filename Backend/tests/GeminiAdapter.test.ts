import { assert, assertEquals, assertRejects, assertStringIncludes } from "jsr:@std/assert@1";
import { GeminiAdapter } from "../functions/coaching/llm/GeminiAdapter.ts";
import { taxonomy } from "../functions/coaching/taxonomy.ts";
import type { CoachingRequest, OpenerRequest } from "../functions/coaching/llm/LLMProvider.ts";

const allowedTags = taxonomy.allowed;

const SAMPLE_COACHING_RESPONSE = {
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

const SAMPLE_OPENER_RESPONSE = {
  openers: [
    { text: "your dog photo is elite", psychologyTag: "Turning toward a bid", style: "playful" },
    { text: "hiking spot in your bio looks great", psychologyTag: "Reflective validation", style: "sincere" },
    { text: "what got you into climbing", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
  ],
};

function mockFetch(bodyToReturn: unknown, ok = true, capturedRequests: any[] = []) {
  return (_url: string | URL | Request, init?: RequestInit) => {
    capturedRequests.push({ url: _url, init });
    if (!ok) {
      return Promise.resolve(
        new Response("mock error", { status: 500, statusText: "Internal Server Error" }),
      );
    }
    const candidate = {
      candidates: [{ content: { parts: [{ text: JSON.stringify(bodyToReturn) }] } }],
    };
    return Promise.resolve(new Response(JSON.stringify(candidate), { status: 200 }));
  };
}

const sampleRequest: CoachingRequest = {
  transcript: [
    { speaker: "match", text: "hey how's it going", order: 0 },
    { speaker: "user", text: "good, you?", order: 1 },
  ],
};

Deno.test("generateCoaching (mocked fetch) resolves to a CoachingResponse with exactly 3 replies and a sentiment object", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = mockFetch(SAMPLE_COACHING_RESPONSE) as typeof fetch;
    const adapter = new GeminiAdapter("test-api-key");
    const result = await adapter.generateCoaching(sampleRequest, allowedTags);
    assertEquals(result.replies.length, 3);
    assert(result.sentiment);
    assertEquals(result.sentiment.factors.interest, 0.6);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("outgoing request body carries responseMimeType application/json and minItems/maxItems 3 on replies", async () => {
  const originalFetch = globalThis.fetch;
  const captured: any[] = [];
  try {
    globalThis.fetch = mockFetch(SAMPLE_COACHING_RESPONSE, true, captured) as typeof fetch;
    const adapter = new GeminiAdapter("test-api-key");
    await adapter.generateCoaching(sampleRequest, allowedTags);

    assertEquals(captured.length, 1);
    const body = JSON.parse(captured[0].init.body as string);
    assertEquals(body.generationConfig.responseMimeType, "application/json");
    assertEquals(body.generationConfig.responseSchema.properties.replies.minItems, 3);
    assertEquals(body.generationConfig.responseSchema.properties.replies.maxItems, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("outgoing request carries the API key and a systemInstruction built from allowed tags", async () => {
  const originalFetch = globalThis.fetch;
  const captured: any[] = [];
  try {
    globalThis.fetch = mockFetch(SAMPLE_COACHING_RESPONSE, true, captured) as typeof fetch;
    const adapter = new GeminiAdapter("test-api-key-123");
    await adapter.generateCoaching(sampleRequest, allowedTags);

    const urlStr = String(captured[0].url);
    assertStringIncludes(urlStr, "key=test-api-key-123");

    const body = JSON.parse(captured[0].init.body as string);
    assertStringIncludes(body.systemInstruction.parts[0].text, allowedTags[0].tagName);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("generateOpeners (mocked fetch) resolves to an openers object from OpenerRequest.profileText", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = mockFetch(SAMPLE_OPENER_RESPONSE) as typeof fetch;
    const adapter = new GeminiAdapter("test-api-key");
    const req: OpenerRequest = { profileText: "Loves hiking and dogs. 28, Auckland." };
    const result = await adapter.generateOpeners(req, allowedTags);
    assertEquals(result.openers.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("a non-ok fetch response causes generateCoaching to throw", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = mockFetch(SAMPLE_COACHING_RESPONSE, false) as typeof fetch;
    const adapter = new GeminiAdapter("test-api-key");
    await assertRejects(() => adapter.generateCoaching(sampleRequest, allowedTags));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetch is the mock, not the real network - restored after each test", () => {
  // If any prior test failed to restore globalThis.fetch in its finally block,
  // this test (running after all mocked ones) would see a mock fetch here.
  assertEquals(globalThis.fetch.toString().includes("mock"), false);
});
