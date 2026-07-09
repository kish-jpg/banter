import { taxonomy, allowedTagNames, containsBannedTerm } from "./taxonomy.ts";
import { validateCoachingResponse, validateGradeResponse } from "./validate.ts";
import { GeminiAdapter } from "./llm/GeminiAdapter.ts";
import type {
  CoachingRequest,
  CoachingResponse,
  GradeResponse,
  LLMProvider,
  TranscriptEntry,
} from "./llm/LLMProvider.ts";

// V5 / T-03-08: request-size DoS cap, checked before any Gemini call.
const MAX_MESSAGES = 50;
const MAX_TOTAL_CHARS = 8000;
const TONE_VALUES = ["playful", "sincere", "witty", "direct"] as const;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(reason: string): Response {
  return jsonResponse({ error: reason }, 400);
}

function isTranscriptEntry(v: unknown): v is TranscriptEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    (e.speaker === "user" || e.speaker === "match") &&
    typeof e.text === "string" &&
    typeof e.order === "number"
  );
}

function validateCoachingRequestBody(body: any): { error: string } | { request: CoachingRequest } {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { error: "messages must be a non-empty array" };
  }
  if (body.messages.length > MAX_MESSAGES) {
    return { error: `messages exceeds max count of ${MAX_MESSAGES}` };
  }
  if (!body.messages.every(isTranscriptEntry)) {
    return { error: "every message must have speaker (user|match), text, order" };
  }
  const totalChars = body.messages.reduce((sum: number, m: TranscriptEntry) => sum + m.text.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return { error: `transcript exceeds max total length of ${MAX_TOTAL_CHARS} chars` };
  }
  if (body.tone !== undefined && !TONE_VALUES.includes(body.tone)) {
    return { error: `tone must be one of ${TONE_VALUES.join(", ")}` };
  }
  if (body.profileSummary !== undefined && (typeof body.profileSummary !== "string" || body.profileSummary.length > 1000)) {
    return { error: "profileSummary must be a string of at most 1000 chars" };
  }
  return {
    request: {
      transcript: body.messages as TranscriptEntry[],
      tone: body.tone,
      profileSummary: body.profileSummary,
    },
  };
}

/** Retries a gate-checked generation once with a stricter reminder; returns null if it still fails (including provider errors). */
async function generateAndGate<T>(
  generate: (stricter: boolean) => Promise<T>,
  validate: (candidate: T, allowed: Set<string>) => { valid: boolean; reason?: string },
): Promise<T | null> {
  const allowed = allowedTagNames();
  for (const stricter of [false, true]) {
    try {
      const candidate = await generate(stricter);
      const result = validate(candidate, allowed);
      if (result.valid) return candidate;
    } catch {
      // provider error (network, non-ok, safety-blocked, malformed JSON) - treat as a failed attempt, not a crash
    }
  }
  return null;
}

const validateReplies = (
  candidate: { replies: { text: string; psychologyTag: string }[] },
  allowed: Set<string>,
) => validateCoachingResponse(candidate, allowed, containsBannedTerm);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates conversationId is a UUID-shaped string or absent; drops anything else rather than echoing garbage back. */
function sanitizeConversationId(v: unknown): string | undefined {
  return typeof v === "string" && UUID_RE.test(v) ? v : undefined;
}

/** The real request handler, exported so tests can invoke it directly instead of reimplementing its logic. */
export async function handleCoachingRequest(req: Request, provider: LLMProvider): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON body");
  }
  if (typeof body !== "object" || body === null) {
    return badRequest("request body must be a JSON object");
  }

  const adapter = provider;
  const allowedTags = taxonomy.allowed;
  const conversationId = sanitizeConversationId(body.conversationId);

  // Opener path (COAC-07): profileText present, no messages transcript.
  if (typeof body.profileText === "string") {
    if (body.profileText.length === 0) {
      return badRequest("profileText must not be empty");
    }
    if (body.profileText.length > MAX_TOTAL_CHARS) {
      return badRequest(`profileText exceeds max length of ${MAX_TOTAL_CHARS} chars`);
    }
    const result = await generateAndGate(async (stricter) => {
      const { openers } = await adapter.generateOpeners(
        { profileText: stricter ? `${body.profileText}\n\nStrictly follow every style rule.` : body.profileText },
        allowedTags,
      );
      return { replies: openers };
    }, validateReplies);
    if (!result) return jsonResponse({ error: "gate rejected generated content" }, 502);
    return jsonResponse({ openers: result.replies, conversationId }, 200);
  }

  const parsed = validateCoachingRequestBody(body);
  if ("error" in parsed) return badRequest(parsed.error);

  // Grade path (GROW-01, 06-RESEARCH Pattern 1): own attempt + confirmed transcript context.
  if (body.mode === "grade") {
    if (typeof body.attemptText !== "string" || body.attemptText.length === 0) {
      return badRequest("attemptText must be a non-empty string");
    }
    if (body.attemptText.length > MAX_TOTAL_CHARS) {
      return badRequest(`attemptText exceeds max length of ${MAX_TOTAL_CHARS} chars`);
    }
    // ponytail: stricter has no prompt-level effect here (temperature 0 judge) - the
    // second pass still catches transient provider errors and schema misses.
    const graded = await generateAndGate<GradeResponse>(
      () =>
        adapter.gradeAttempt(
          {
            attemptText: body.attemptText,
            transcript: parsed.request.transcript,
            profileSummary: parsed.request.profileSummary,
          },
          allowedTags,
        ),
      (candidate, allowed) => validateGradeResponse(candidate, allowed, containsBannedTerm),
    );
    if (!graded) return jsonResponse({ error: "gate rejected generated content" }, 502);
    return jsonResponse({ ...graded, conversationId }, 200);
  }

  const result = await generateAndGate<CoachingResponse>((stricter) =>
    adapter.generateCoaching(
      stricter
        ? { ...parsed.request, tone: parsed.request.tone ?? "sincere" }
        : parsed.request,
      allowedTags,
    ), validateReplies);
  if (!result) return jsonResponse({ error: "gate rejected generated content" }, 502);

  // Server-stateless per Phase 3 scope (Open Q2): no SentimentEvent persistence here.
  // The response carries aggregate sentiment; event-timeline persistence is Phase 4.
  return jsonResponse({ ...result, conversationId }, 200);
}

// ponytail: only listen when run directly (deployed function entrypoint), not when
// imported by tests - Deno.serve() requires --allow-net, which the test suite doesn't grant.
if (import.meta.main) {
  Deno.serve((req: Request) => {
    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    return handleCoachingRequest(req, new GeminiAdapter(apiKey));
  });
}
