import { assertEquals } from "jsr:@std/assert@1";
import sampleFixture from "./fixtures/coaching-response.sample.json" with { type: "json" };
import { handleCoachingRequest } from "../functions/coaching/index.ts";
import type {
  CoachingRequest,
  CoachingResponse,
  GradeRequest,
  GradeResponse,
  LLMProvider,
  OpenerRequest,
} from "../functions/coaching/llm/LLMProvider.ts";

// These tests call the REAL Deno.serve handler (handleCoachingRequest), exported from
// index.ts specifically so it can be exercised directly here instead of reimplemented.
// A stub LLMProvider is injected in place of GeminiAdapter - no network, no globalThis.fetch mocking.

const OFF_ALLOWLIST_RESPONSE: CoachingResponse = {
  replies: [
    { text: "reply one", psychologyTag: "Alpha dominance", style: "playful" },
    { text: "reply two", psychologyTag: "Reflective validation", style: "sincere" },
    { text: "reply three", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
  ],
  sentiment: sampleFixture.sentiment as CoachingResponse["sentiment"],
};

const BANNED_TERM_RESPONSE: CoachingResponse = {
  replies: [
    { text: "try a bit of negging here", psychologyTag: "Turning toward a bid", style: "playful" },
    { text: "reply two", psychologyTag: "Reflective validation", style: "sincere" },
    { text: "reply three", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
  ],
  sentiment: sampleFixture.sentiment as CoachingResponse["sentiment"],
};

const OPENER_RESPONSE: CoachingResponse["replies"] = [
  { text: "your dog photo is elite", psychologyTag: "Turning toward a bid", style: "playful" },
  { text: "hiking spot in your bio looks great", psychologyTag: "Reflective validation", style: "sincere" },
  { text: "what got you into climbing", psychologyTag: "Reciprocal self-disclosure", style: "direct" },
];

const VALID_GRADE: GradeResponse = {
  dimensions: [
    { dimension: "warmth", reasoning: "engaged and friendly", score: 4 },
    { dimension: "specificity", reasoning: "references the bungee story", score: 5 },
    { dimension: "reciprocity", reasoning: "asks a question back", score: 4 },
    { dimension: "naturalness", reasoning: "reads like a real text", score: 4 },
  ],
  overallScore: 4,
  strengthNote: "You kept their energy and gave them something to respond to.",
  improvementNote: "Add one concrete detail of your own next time.",
  citedTag: "Mutual exchange",
};

/** Stub LLMProvider: returns a canned sequence of coaching responses (one per generateAndGate attempt), or throws. */
function stubProvider(
  coachingSequence: (CoachingResponse | "throw")[],
  openerSequence: (CoachingResponse["replies"] | "throw")[] = [],
  gradeSequence: (GradeResponse | "throw")[] = [],
): LLMProvider {
  let coachingCall = 0;
  let openerCall = 0;
  let gradeCall = 0;
  return {
    generateCoaching(_req: CoachingRequest) {
      const next = coachingSequence[Math.min(coachingCall, coachingSequence.length - 1)];
      coachingCall++;
      if (next === "throw") return Promise.reject(new Error("simulated provider failure"));
      return Promise.resolve(next);
    },
    generateOpeners(_req: OpenerRequest) {
      const next = openerSequence[Math.min(openerCall, openerSequence.length - 1)];
      openerCall++;
      if (next === "throw") return Promise.reject(new Error("simulated provider failure"));
      return Promise.resolve({ openers: next });
    },
    gradeAttempt(_req: GradeRequest) {
      const next = gradeSequence[Math.min(gradeCall, gradeSequence.length - 1)];
      gradeCall++;
      if (next === "throw") return Promise.reject(new Error("simulated provider failure"));
      return Promise.resolve(next);
    },
  };
}

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/functions/v1/coaching", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

function rawBodyRequest(rawBody: string): Request {
  return new Request("http://localhost/functions/v1/coaching", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

const sampleCoachingRequest = {
  messages: [
    { speaker: "match", text: "hey how's it going", order: 0 },
    { speaker: "user", text: "good, you?", order: 1 },
  ],
};

Deno.test("happy path: valid provider response returns 200 with exactly 3 replies + sentiment", async () => {
  const res = await handleCoachingRequest(makeRequest(sampleCoachingRequest), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.replies.length, 3);
  assertEquals(typeof body.sentiment.score, "number");
});

Deno.test("gate-rejection retry: off-allowlist tag on first call, valid on retry -> 200", async () => {
  const res = await handleCoachingRequest(
    makeRequest(sampleCoachingRequest),
    stubProvider([OFF_ALLOWLIST_RESPONSE, sampleFixture as CoachingResponse]),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.replies.length, 3);
});

Deno.test("gate-rejection both attempts: banned term on both calls -> 502, bad content never returned", async () => {
  const res = await handleCoachingRequest(
    makeRequest(sampleCoachingRequest),
    stubProvider([BANNED_TERM_RESPONSE, BANNED_TERM_RESPONSE]),
  );
  assertEquals(res.status, 502);
  const body = await res.json();
  assertEquals(body.error, "gate rejected generated content");
});

Deno.test("provider throws on first attempt, succeeds on retry -> 200 (CR-03: no uncaught crash)", async () => {
  const res = await handleCoachingRequest(
    makeRequest(sampleCoachingRequest),
    stubProvider(["throw", sampleFixture as CoachingResponse]),
  );
  assertEquals(res.status, 200);
});

Deno.test("provider throws on both attempts -> 502, not an uncaught exception (CR-03)", async () => {
  const res = await handleCoachingRequest(makeRequest(sampleCoachingRequest), stubProvider(["throw", "throw"]));
  assertEquals(res.status, 502);
  const body = await res.json();
  assertEquals(body.error, "gate rejected generated content");
});

Deno.test("null JSON body is rejected with 400, not an uncaught TypeError (CR-02)", async () => {
  const res = await handleCoachingRequest(rawBodyRequest("null"), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 400);
});

Deno.test("non-object JSON body (a bare number) is rejected with 400 (CR-02)", async () => {
  const res = await handleCoachingRequest(rawBodyRequest("42"), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 400);
});

Deno.test("malformed (unparseable) JSON body is rejected with 400", async () => {
  const res = await handleCoachingRequest(rawBodyRequest("{not json"), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 400);
});

Deno.test("non-POST method is rejected with 405", async () => {
  const res = await handleCoachingRequest(makeRequest(undefined, "GET"), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 405);
});

Deno.test("empty messages array is rejected (400, V5 input validation)", async () => {
  const res = await handleCoachingRequest(makeRequest({ messages: [] }), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 400);
});

Deno.test("oversized transcript (over length cap) is rejected (400, V5 DoS cost cap)", async () => {
  const bigText = "x".repeat(8001);
  const req = makeRequest({ messages: [{ speaker: "user", text: bigText, order: 0 }] });
  const res = await handleCoachingRequest(req, stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 400);
});

Deno.test("opener path (COAC-07): profileText request generates openers through the same gate", async () => {
  const res = await handleCoachingRequest(
    makeRequest({ profileText: "Loves hiking and dogs. 28, Auckland." }),
    stubProvider([], [OPENER_RESPONSE]),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.openers.length, 3);
});

Deno.test("a valid 200 response body matches coaching-response.sample.json's shape (the fixture is the contract)", async () => {
  const res = await handleCoachingRequest(makeRequest(sampleCoachingRequest), stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(Object.keys(body).sort(), Object.keys(sampleFixture).sort());
  for (const reply of body.replies) {
    assertEquals(Object.keys(reply).sort(), ["psychologyTag", "style", "text"]);
  }
  assertEquals(Object.keys(body.sentiment).sort(), Object.keys(sampleFixture.sentiment).sort());
});

Deno.test("grade path (GROW-01): mode=grade + attemptText returns rubric grade through the gate", async () => {
  const req = makeRequest({ ...sampleCoachingRequest, mode: "grade", attemptText: "haha yes I screamed. what about you, ever done something wild?" });
  const res = await handleCoachingRequest(req, stubProvider([], [], [VALID_GRADE]));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.dimensions.length, 4);
  assertEquals(typeof body.overallScore, "number");
  assertEquals(body.citedTag, "Mutual exchange");
});

Deno.test("grade path: off-allowlist citedTag on both attempts -> 502, never reaches the user", async () => {
  const badGrade = { ...VALID_GRADE, citedTag: "Alpha dominance" };
  const req = makeRequest({ ...sampleCoachingRequest, mode: "grade", attemptText: "some attempt" });
  const res = await handleCoachingRequest(req, stubProvider([], [], [badGrade, badGrade]));
  assertEquals(res.status, 502);
});

Deno.test("grade path: banned term in feedback text on both attempts -> 502 (COAC-06 gates ALL generation)", async () => {
  const badGrade = { ...VALID_GRADE, improvementNote: "try some negging next time" };
  const req = makeRequest({ ...sampleCoachingRequest, mode: "grade", attemptText: "some attempt" });
  const res = await handleCoachingRequest(req, stubProvider([], [], [badGrade, badGrade]));
  assertEquals(res.status, 502);
});

Deno.test("grade path: empty attemptText is rejected with 400", async () => {
  const req = makeRequest({ ...sampleCoachingRequest, mode: "grade", attemptText: "" });
  const res = await handleCoachingRequest(req, stubProvider([], [], [VALID_GRADE]));
  assertEquals(res.status, 400);
});

Deno.test("grade path: oversized attemptText is rejected with 400 (V5 cost cap)", async () => {
  const req = makeRequest({ ...sampleCoachingRequest, mode: "grade", attemptText: "x".repeat(8001) });
  const res = await handleCoachingRequest(req, stubProvider([], [], [VALID_GRADE]));
  assertEquals(res.status, 400);
});

Deno.test("valid UUID conversationId is echoed back (WR-05)", async () => {
  const req = makeRequest({ ...sampleCoachingRequest, conversationId: "123e4567-e89b-12d3-a456-426614174000" });
  const res = await handleCoachingRequest(req, stubProvider([sampleFixture as CoachingResponse]));
  const body = await res.json();
  assertEquals(body.conversationId, "123e4567-e89b-12d3-a456-426614174000");
});

Deno.test("malformed conversationId is dropped, not echoed back (WR-05)", async () => {
  const req = makeRequest({ ...sampleCoachingRequest, conversationId: "not-a-uuid" });
  const res = await handleCoachingRequest(req, stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.conversationId, undefined);
});

Deno.test("personaFacts over the cap (9 items) are rejected with 400 (V5 cost cap)", async () => {
  const req = makeRequest({ ...sampleCoachingRequest, personaFacts: Array(9).fill("a fact") });
  const res = await handleCoachingRequest(req, stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 400);
});

Deno.test("valid personaFacts + paceContext pass through to a 200", async () => {
  const req = makeRequest({
    ...sampleCoachingRequest,
    personaFacts: ["has a dog named Biscuit"],
    paceContext: "both replying quickly",
  });
  const res = await handleCoachingRequest(req, stubProvider([sampleFixture as CoachingResponse]));
  assertEquals(res.status, 200);
});
