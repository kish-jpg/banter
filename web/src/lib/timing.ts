import type { TranscriptEntry } from "./types";

/**
 * Pace analysis (INTENT-PERSONA-ENGINE timing). Works on whatever timestamps the
 * import surfaced - degrades gracefully to null when coverage is too thin.
 * Pure functions; caller passes `now`.
 */

export interface PaceRead {
  /** Median minutes each side takes to respond to the other. */
  userMedianMin: number | null;
  matchMedianMin: number | null;
  /** Match's latency direction across the conversation. */
  trend: "warming" | "steady" | "cooling" | null;
  /** User messages sent 20+ min after their own previous message with no reply between. */
  userDoubleTexts: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function analyzePace(messages: TranscriptEntry[]): PaceRead {
  const ordered = [...messages].sort((a, b) => a.order - b.order);
  const userGaps: number[] = [];
  const matchGaps: number[] = [];
  let userDoubleTexts = 0;

  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const cur = ordered[i];
    if (prev.ts === undefined || cur.ts === undefined) continue;
    const gapMin = (cur.ts - prev.ts) / 60_000;
    if (gapMin < 0 || gapMin > 7 * 24 * 60) continue; // unparseable / new-conversation gap
    if (cur.speaker !== prev.speaker) {
      (cur.speaker === "user" ? userGaps : matchGaps).push(gapMin);
    } else if (cur.speaker === "user" && gapMin >= 20) {
      userDoubleTexts++;
    }
  }

  let trend: PaceRead["trend"] = null;
  if (matchGaps.length >= 3) {
    const half = Math.floor(matchGaps.length / 2);
    const early = median(matchGaps.slice(0, half))!;
    const late = median(matchGaps.slice(half))!;
    trend = late < early * 0.6 ? "warming" : late > early * 1.7 ? "cooling" : "steady";
  }

  return {
    userMedianMin: median(userGaps),
    matchMedianMin: median(matchGaps),
    trend,
    userDoubleTexts,
  };
}

function describeMin(min: number): string {
  if (min < 2) return "within moments";
  if (min < 60) return `in about ${Math.round(min)} minutes`;
  return `in about ${Math.round(min / 60)} hours`;
}

/** One-liner for the engine's paceContext field. Null when there's nothing worth saying. */
export function paceContextLine(pace: PaceRead, now: Date): string | null {
  const parts: string[] = [];
  if (pace.userMedianMin !== null && pace.matchMedianMin !== null) {
    parts.push(
      `the user typically replies ${describeMin(pace.userMedianMin)}, the other person ${describeMin(pace.matchMedianMin)}`,
    );
  }
  if (pace.trend === "cooling") parts.push("their replies are slowing down");
  if (pace.trend === "warming") parts.push("their replies are speeding up");
  if (pace.userDoubleTexts >= 2) parts.push("the user has double-texted more than once");
  const hour = now.getHours();
  if (hour >= 22 || hour < 5) parts.push(`it is currently ${hour}:00 (late night) for the user`);
  return parts.length > 0 ? parts.join("; ") : null;
}

/** Timing watch-out for the UI. At most one, most important first. Never advises manufactured distance. */
export function timingWatchOut(pace: PaceRead, now: Date): string | null {
  const hour = now.getHours();
  if (
    pace.userMedianMin !== null &&
    pace.matchMedianMin !== null &&
    pace.userMedianMin < 5 &&
    pace.matchMedianMin > pace.userMedianMin * 6
  ) {
    return "You reply almost instantly, they take much longer. Not a game to play back at them, just match the conversation's natural pace instead of hovering.";
  }
  if (pace.userDoubleTexts >= 2) {
    return "You've double-texted a couple of times. One message that invites a reply beats two that chase one.";
  }
  if (pace.trend === "cooling") {
    return "Their replies are slowing down. Lower the investment a notch and lead with something easy to answer.";
  }
  if (hour >= 23 || hour < 5) {
    return "It's late where you are. A message sent now reads different at this hour, make sure that's the read you want.";
  }
  return null;
}
