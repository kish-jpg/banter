import type { FactType, PersonaFact } from "./persona";
import type { TranscriptEntry } from "./types";

/**
 * Salience scoring (INTENT-PERSONA-ENGINE #2): which persona facts earn a place in
 * THIS turn's prompt. relevance × recency × novelty × stage-appropriateness, top-k.
 * Pure functions - no I/O, no Date.now (caller passes `now`).
 */

export type Stage = "opening" | "rapport" | "depth" | "momentum";

// Which fact types fit which stage. Light interests early; stories/boundaries at depth;
// logistics when making plans. Hooks are opener fuel and fade after opening.
const STAGE_WEIGHTS: Record<Stage, Partial<Record<FactType, number>>> = {
  opening: { hook: 1.0, interest: 0.9, "inside-joke": 0.2, story: 0.4, dislike: 0.5, logistics: 0.3, boundary: 1.0 },
  rapport: { hook: 0.5, interest: 1.0, "inside-joke": 0.9, story: 0.7, dislike: 0.6, logistics: 0.4, boundary: 1.0 },
  depth: { hook: 0.2, interest: 0.7, "inside-joke": 0.8, story: 1.0, dislike: 0.7, logistics: 0.5, boundary: 1.0 },
  momentum: { hook: 0.1, interest: 0.6, "inside-joke": 0.7, story: 0.5, dislike: 0.8, logistics: 1.0, boundary: 1.0 },
};

const STOPWORDS = new Set(
  "the a an and or but so to of in on at for with you your i me my we they them it its is are was be been do did have has had this that what how when where who whats hows".split(" "),
);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Keyword overlap between a fact and the tail of the conversation, 0..1. */
export function relevance(fact: PersonaFact, recentMessages: TranscriptEntry[]): number {
  const factWords = keywords(`${fact.text} ${fact.quote}`);
  if (factWords.size === 0) return 0;
  const convoWords = keywords(recentMessages.map((m) => m.text).join(" "));
  let hits = 0;
  for (const w of factWords) if (convoWords.has(w)) hits++;
  return hits / factWords.size;
}

/** Half-life decay: a fact learned ~2 weeks ago scores 0.5. Manual facts don't decay. */
export function recencyWeight(fact: PersonaFact, now: number): number {
  if (fact.source === "manual") return 1;
  const ageDays = Math.max(0, (now - fact.addedAt) / 86_400_000);
  return Math.pow(0.5, ageDays / 14);
}

/**
 * Novelty penalty - the single most important criterion: a fact already called back
 * twice is buried. Nothing reads more AI than mentioning her dog in every reply.
 */
export function noveltyWeight(fact: PersonaFact): number {
  return 1 / (1 + fact.timesUsed * fact.timesUsed);
}

export function scoreFact(
  fact: PersonaFact,
  recentMessages: TranscriptEntry[],
  stage: Stage,
  now: number,
): number {
  const stageW = STAGE_WEIGHTS[stage][fact.type] ?? 0.5;
  // Relevance floors at 0.15 so a fresh, stage-appropriate fact can still surface
  // when the current topic doesn't overlap it (that's how new threads get callbacks).
  const rel = Math.max(0.15, relevance(fact, recentMessages));
  return rel * recencyWeight(fact, now) * noveltyWeight(fact) * stageW;
}

/** Top-k facts for this turn, rendered for the engine's personaFacts field. */
export function selectFacts(
  facts: PersonaFact[],
  recentMessages: TranscriptEntry[],
  stage: Stage,
  now: number,
  k = 4,
): PersonaFact[] {
  return [...facts]
    .map((f) => ({ f, s: scoreFact(f, recentMessages, stage, now) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .filter(({ s }) => s > 0.05)
    .map(({ f }) => f);
}

/** Prompt rendering: fact text plus its provenance quote so callbacks stay grounded. */
export function renderFact(fact: PersonaFact): string {
  return fact.quote ? `${fact.text} (they said: "${fact.quote}")` : fact.text;
}
