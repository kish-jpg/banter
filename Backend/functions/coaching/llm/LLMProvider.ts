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
  /**
   * Salience-selected persona facts about the OTHER person, each derived from their own
   * words (strict provenance per INTENT-PERSONA-ENGINE). Client pre-selects top 3-5;
   * the prompt instructs natural use of at most 1-2, never forced.
   */
  personaFacts?: string[];
  /** One-line pace/timing context (e.g. "they reply slowly and are slowing; it is 1am for the user"). */
  paceContext?: string;
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

/** Request to grade the user's own reply attempt against the conversation context (GROW-01). */
export interface GradeRequest {
  attemptText: string;
  transcript: TranscriptEntry[];
  profileSummary?: string;
}

/** Rubric-level, reasoning-first grade per 06-RESEARCH - never a bare holistic score. */
export interface GradeResponse {
  dimensions: {
    dimension: "warmth" | "specificity" | "reciprocity" | "naturalness";
    reasoning: string;
    score: number;
  }[];
  overallScore: number;
  strengthNote: string;
  improvementNote: string;
  citedTag: string;
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
  gradeAttempt(
    req: GradeRequest,
    allowedTags: TaxonomyEntry[],
  ): Promise<GradeResponse>;
}
