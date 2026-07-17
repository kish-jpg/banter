import type { LoopItem } from "./loops";

/**
 * Pre-date readiness (PRD §7.5): facts recalled cold × stories owned ÷ assistance
 * dependence. The gap isn't content — it's retrieval under anxiety without a compose
 * box. Pure functions; callers feed store-derived inputs. Rendered as a band, never
 * a clinical percentage of the user (same dignity rule as reads of the other person).
 */

export interface ReadinessInputs {
  /** Fraction of persona facts held at quiz box 2+ (lib/quiz quizMastery). */
  factsCold: number;
  /** Fraction of the debt list marked owned (rehearsed, tellable cold). */
  storiesOwned: number;
  /** Own attempts / (own attempts + assisted sends) for this thread. */
  independence: number;
}

/** owned / (open + owned) across the debt list; nothing owed = fully ready on this axis. */
export function storiesOwnedRatio(debt: LoopItem[]): number {
  if (debt.length === 0) return 1;
  return debt.filter((l) => l.status === "owned").length / debt.length;
}

/** No signal either way reads neutral, not failing — new threads shouldn't scare. */
export function independenceRatio(ownAttempts: number, assistedSends: number): number {
  if (ownAttempts + assistedSends === 0) return 0.5;
  return ownAttempts / (ownAttempts + assistedSends);
}

/**
 * Weighted blend, 0..1. Facts weigh heaviest (they're the retrieval-under-anxiety
 * core), then owned stories, then independence (the fade curve's local reading).
 */
export function readinessScore(r: ReadinessInputs): number {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return clamp(0.4 * clamp(r.factsCold) + 0.35 * clamp(r.storiesOwned) + 0.25 * clamp(r.independence));
}

export type ReadinessBand = "not yet" | "getting there" | "ready";

/** Same cutoffs as signal bands (0.45 / 0.70) so the product speaks one language. */
export function readinessBand(score: number): ReadinessBand {
  return score < 0.45 ? "not yet" : score < 0.7 ? "getting there" : "ready";
}
