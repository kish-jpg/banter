import type { Sentiment } from "./types";
import type { Stage } from "./salience";

/**
 * Conversation stage machine (INTENT-PERSONA-ENGINE #3): opening → rapport → depth →
 * momentum, from message count + signal trajectory. Gates fact selection, coach-mode
 * cadence, and the walk-away recommendation. Pure functions.
 */

export function stageFor(messageCount: number, history: Sentiment[]): Stage {
  const last = history[history.length - 1];
  if (messageCount < 6) return "opening";
  // Momentum: both sides invested and the thread has real length - time to make plans.
  if (
    messageCount >= 12 &&
    last &&
    last.factors.interest >= 0.75 &&
    last.factors.reciprocity >= 0.65
  ) {
    return "momentum";
  }
  // Depth: sustained warmth over a longer arc.
  if (messageCount >= 20 && last && (last.factors.warmth + last.factors.reciprocity) / 2 >= 0.55) {
    return "depth";
  }
  return "rapport";
}

export const STAGE_LABELS: Record<Stage, string> = {
  opening: "opening",
  rapport: "building rapport",
  depth: "getting real",
  momentum: "make the plan",
};

/**
 * Walk-away check: two consecutive weak reads with no recovery. Real coaching includes
 * "stop texting this person" - the trust moment most apps refuse to ship.
 */
export function shouldWalkAway(history: Sentiment[]): boolean {
  if (history.length < 2) return false;
  const [a, b] = history.slice(-2);
  const invest = (s: Sentiment) => (s.factors.interest + s.factors.reciprocity) / 2;
  return invest(a) < 0.45 && invest(b) < 0.4 && invest(b) <= invest(a);
}

/**
 * Adaptive assist (intent doc): how many assisted replies before the app requires an
 * own attempt first. Fades from 5 (new) to 2 (skilled) as the user levels up.
 */
export function cadenceFor(level: number): number {
  return Math.max(2, 5 - Math.floor((level - 1) / 2));
}

export function needsOwnAttemptFirst(assistsSinceOwnAttempt: number, level: number): boolean {
  return assistsSinceOwnAttempt >= cadenceFor(level);
}

/** Banded reads (intent doc): show bands, not raw precision - a "34%" dial wrecks anxious users. */
export function band(value: number): "low" | "warming" | "strong" {
  return value < 0.45 ? "low" : value < 0.7 ? "warming" : "strong";
}
