import type { TaxonomyEntry } from "../taxonomy.ts";

/** A single transcript line, ordered and speaker-attributed. Mirrors ConversationMessage.swift. */
export interface TranscriptEntry {
  speaker: "user" | "match";
  text: string;
  order: number;
}

/**
 * Request to generate 3 coaching replies + sentiment for a confirmed transcript.
 * LOCKED shape - mirrors AnalyzeConversationRequest.swift. No conversationId here;
 * the client mints/echoes conversationId at the index.ts/DTO layer (03-03).
 */
export interface CoachingRequest {
  transcript: TranscriptEntry[];
  tone?: "playful" | "sincere" | "witty" | "direct";
  /** Stub until Phase 6's profile engine exists - pass whatever the client sends (currently nothing durable). */
  profileSummary?: string;
}

/**
 * LOCKED response shape - mirrors ReplySuggestion.swift exactly (text/psychologyTag/style,
 * NO confidence field). sentiment.factors is a fixed-key object, not Record<string, number>.
 */
export interface CoachingResponse {
  replies: {
    text: string;
    psychologyTag: string;
    style: "playful" | "sincere" | "witty" | "direct";
  }[];
  sentiment: {
    score: number;
    factors: {
      interest: number;
      reciprocity: number;
      warmth: number;
      responsiveness: number;
    };
    signal: string;
  };
}

/** Request to generate conversation openers from an OCR'd match-profile screenshot's structured text. */
export interface OpenerRequest {
  profileText: string;
}

/** Provider-abstracted LLM interface - the swap seam (D-03). Callers depend only on this, never on a specific adapter. */
export interface LLMProvider {
  generateCoaching(
    req: CoachingRequest,
    allowedTags: TaxonomyEntry[],
  ): Promise<CoachingResponse>;
  generateOpeners(
    req: OpenerRequest,
    allowedTags: TaxonomyEntry[],
  ): Promise<{ openers: CoachingResponse["replies"] }>;
}
