/** Minimal structural shape - provider-agnostic on purpose (Pitfall 3: no Gemini-specific type here). */
export interface ValidatableResponse {
  replies: { text: string; psychologyTag: string }[];
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
