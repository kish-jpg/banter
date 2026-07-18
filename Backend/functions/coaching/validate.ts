/** Minimal structural shape - provider-agnostic on purpose (Pitfall 3: no Gemini-specific type here). */
export interface ValidatableResponse {
  replies: { text: string; psychologyTag: string }[];
  /** Present on coaching responses, absent on openers. Enum re-checked here (defense-in-depth over the schema). */
  sentiment?: { conversationType?: string };
}

const CONVERSATION_TYPES = ["practical", "emotional", "social"];

/**
 * Gate v2 (R3): frame classifier. Prize-framing flips play into hierarchy - the
 * case-study failure mode ("my best positions are earned"). A reply that frames
 * the user as the prize and the match as the applicant is discarded, never repaired.
 */
const FRAME_PATTERNS = [
  /(?:\b(?:is|are|be|being|been|get|gets)\s+|'re\s+)earned\b/i,
  /\bearn\s+(it|that|the right|your (way|place|spot))\b/i,
  /\bprove\s+(yourself|it to me|you'?re worth)\b/i,
  /\b(you'?d|you'?ll|you would) be lucky\b/i,
  /\bif you'?re lucky\b/i,
  /\blucky to (have|get|know) me\b/i,
  /\bdeserve me\b/i,
  /\bworthy of (me|my)\b/i,
];

/** Gate v2: evaluation-language (NVC). Judging characterizations, narrow on purpose to avoid false positives. */
const EVALUATION_PATTERNS = [
  /\byou'?re (so |being |too )?(distant|cold|needy|dramatic|difficult|lazy|selfish)\b/i,
];

/** Shared per-text checks for generated reply content. Returns a rejection reason or null. */
function replyTextViolation(text: string): string | null {
  if (/—/.test(text) || /;/.test(text)) {
    return "AI-tell punctuation (em dash or semicolon) detected";
  }
  if ((text.match(/\?+/g) ?? []).length > 1) {
    return "question stacking (more than one question in a single reply)";
  }
  if (FRAME_PATTERNS.some((re) => re.test(text))) {
    return "prize-framing detected (frame classifier)";
  }
  if (EVALUATION_PATTERNS.some((re) => re.test(text))) {
    return "evaluation language detected (observation beats evaluation)";
  }
  return null;
}

/** Grade-shaped sibling of ValidatableResponse (06-RESEARCH: COAC-06 gates ALL generation). */
export interface ValidatableGrade {
  dimensions: { dimension: string; reasoning: string; score: number }[];
  overallScore: number;
  strengthNote: string;
  improvementNote: string;
  citedTag: string;
}

const REQUIRED_DIMENSIONS = ["warmth", "specificity", "reciprocity", "naturalness"];

export function validateGradeResponse(
  resp: ValidatableGrade,
  allowedTags: Set<string>,
  bannedTermCheck: (text: string) => string | null,
): { valid: boolean; reason?: string } {
  if (!allowedTags.has(resp.citedTag)) {
    return { valid: false, reason: `tag "${resp.citedTag}" not in allowlist` };
  }
  const dims = resp.dimensions.map((d) => d.dimension);
  if (dims.length !== 4 || !REQUIRED_DIMENSIONS.every((d) => dims.includes(d))) {
    return { valid: false, reason: `expected exactly the 4 rubric dimensions, got [${dims.join(", ")}]` };
  }
  for (const d of resp.dimensions) {
    if (!(d.score >= 1 && d.score <= 5)) {
      return { valid: false, reason: `dimension "${d.dimension}" score ${d.score} outside 1-5` };
    }
  }
  if (!(resp.overallScore >= 1 && resp.overallScore <= 5)) {
    return { valid: false, reason: `overallScore ${resp.overallScore} outside 1-5` };
  }
  const feedbackTexts = [resp.strengthNote, resp.improvementNote, ...resp.dimensions.map((d) => d.reasoning)];
  for (const text of feedbackTexts) {
    const banned = bannedTermCheck(text);
    if (banned) {
      return { valid: false, reason: `banned term "${banned}" found` };
    }
  }
  for (const text of [resp.strengthNote, resp.improvementNote]) {
    if (/—/.test(text) || /;/.test(text)) {
      return { valid: false, reason: "AI-tell punctuation (em dash or semicolon) detected" };
    }
  }
  return { valid: true };
}

export function validateCoachingResponse(
  resp: ValidatableResponse,
  allowedTags: Set<string>,
  bannedTermCheck: (text: string) => string | null,
): { valid: boolean; reason?: string } {
  if (resp.replies.length !== 3) {
    return { valid: false, reason: `expected 3 replies, got ${resp.replies.length}` };
  }
  for (const reply of resp.replies) {
    if (!allowedTags.has(reply.psychologyTag)) {
      return { valid: false, reason: `tag "${reply.psychologyTag}" not in allowlist` };
    }
    const banned = bannedTermCheck(reply.text) ?? bannedTermCheck(reply.psychologyTag);
    if (banned) {
      return { valid: false, reason: `banned term "${banned}" found` };
    }
    const violation = replyTextViolation(reply.text);
    if (violation) {
      return { valid: false, reason: violation };
    }
  }
  if (
    resp.sentiment?.conversationType !== undefined &&
    !CONVERSATION_TYPES.includes(resp.sentiment.conversationType)
  ) {
    return { valid: false, reason: `conversationType "${resp.sentiment.conversationType}" not recognized` };
  }
  return { valid: true };
}
