/** Minimal structural shape - provider-agnostic on purpose (Pitfall 3: no Gemini-specific type here). */
export interface ValidatableResponse {
  replies: { text: string; psychologyTag: string }[];
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
    if (/—/.test(reply.text) || /;/.test(reply.text)) {
      return { valid: false, reason: "AI-tell punctuation (em dash or semicolon) detected" };
    }
  }
  return { valid: true };
}
