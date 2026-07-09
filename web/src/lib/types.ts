/** Mirrors Backend/functions/coaching/llm/LLMProvider.ts — LOCKED shapes, do not drift. */

export interface TranscriptEntry {
  speaker: "user" | "match";
  text: string;
  order: number;
}

export type Tone = "playful" | "sincere" | "witty" | "direct";

export interface Reply {
  text: string;
  psychologyTag: string;
  style: Tone;
}

export interface Sentiment {
  score: number;
  factors: {
    interest: number;
    reciprocity: number;
    warmth: number;
    responsiveness: number;
  };
  signal: string;
}

export interface CoachingResponse {
  replies: Reply[];
  sentiment: Sentiment;
  conversationId?: string;
}
