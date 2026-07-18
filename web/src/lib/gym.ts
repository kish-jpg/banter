"use client";

import { useSyncExternalStore } from "react";
import type { Thread } from "./threads";

/**
 * Practice Gym (R3 F, PRD §7.6): a daily 3-minute drill generated from the user's
 * OWN history — a real moment their match sent, replayed under a constraint aimed
 * at the user's weakest graded dimension. Converts the app from
 * conversation-reactive to skill-proactive. One drill/day (decision #5: +8 XP,
 * ×1.5 from a 7-day streak). banter.* prefix, wiped by delete-everything.
 * Generation is deterministic (no Math.random) so it's testable and render-safe.
 */

export type Dim = "warmth" | "specificity" | "reciprocity" | "naturalness";

export interface Constraint {
  id: string;
  dim: Dim;
  label: string;
  /** Client-side mechanical pre-check (before spending a grade round-trip). */
  check?: (text: string) => boolean;
  checkFailMsg?: string;
}

// Constraints per dimension. The mechanical checks catch the obvious misses;
// the grade does the real judging on the standard rubric.
const CONSTRAINTS: Constraint[] = [
  {
    id: "no-question",
    dim: "naturalness",
    label: "reply without asking a question — let a beat land",
    check: (t) => !t.includes("?"),
    checkFailMsg: "that one has a question in it. this drill is about letting a beat land — try again with no question.",
  },
  {
    id: "few-words",
    dim: "naturalness",
    label: "keep it to six words or fewer",
    check: (t) => t.trim().split(/\s+/).filter(Boolean).length <= 6,
    checkFailMsg: "a touch long for this one. six words or fewer — say less, land harder.",
  },
  {
    id: "give-before-ask",
    dim: "reciprocity",
    label: "give them something before you ask anything",
  },
  {
    id: "build-on",
    dim: "reciprocity",
    label: "build on the exact thing they said, don't change the subject",
  },
  {
    id: "warm-good-news",
    dim: "warmth",
    label: "respond like their news actually matters to you",
  },
  {
    id: "lead-warmth",
    dim: "warmth",
    label: "lead with warmth before anything clever",
  },
  {
    id: "name-detail",
    dim: "specificity",
    label: "name one specific detail from their message",
  },
  {
    id: "concrete",
    dim: "specificity",
    label: "reference something concrete, nothing generic",
  },
];

export interface GymDrill {
  id: string;
  at: number;
  momentText: string;
  constraintId: string;
  dim: Dim;
  grade: number;
}

const DIM_ORDER: Dim[] = ["warmth", "specificity", "reciprocity", "naturalness"];

/** Lowest-scoring dimension from a DNA reading; stable tie-break by DIM_ORDER. */
export function weakestDim(dna: Record<Dim, number>): Dim {
  return [...DIM_ORDER].sort((a, b) => dna[a] - dna[b])[0];
}

/** Match messages worth replying to, across all threads (deduped, long enough). */
export function collectMoments(threads: Thread[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of threads) {
    for (const m of t.messages) {
      if (m.speaker !== "match") continue;
      const text = m.text.trim();
      if (text.length < 16) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
  }
  return out;
}

export interface GeneratedDrill {
  momentText: string;
  constraint: Constraint;
  dim: Dim;
}

/**
 * Today's drill: weakest dim → a constraint for it → a real past moment.
 * Deterministic, rotating by how many drills are already done so it doesn't
 * repeat the same pairing. Null when there's no DNA yet or no moments.
 */
export function generateDrill(
  threads: Thread[],
  dna: Record<Dim, number> | null,
  drillsDone: number,
): GeneratedDrill | null {
  if (!dna) return null;
  const moments = collectMoments(threads);
  if (moments.length === 0) return null;
  const dim = weakestDim(dna);
  const forDim = CONSTRAINTS.filter((c) => c.dim === dim);
  const constraint = forDim[drillsDone % forDim.length];
  const momentText = moments[drillsDone % moments.length];
  return { momentText, constraint, dim };
}

// ---- store ----

const KEY = "banter.gym";

const listeners = new Set<() => void>();
let cache: GymDrill[] | null = null;

function read(): GymDrill[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as GymDrill[];
  } catch {
    return [];
  }
}

export function subscribeGym(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getGymSnapshot(): GymDrill[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: GymDrill[] = [];
export function getGymServerSnapshot(): GymDrill[] {
  return EMPTY;
}

export function useGymDrills(): GymDrill[] {
  return useSyncExternalStore(subscribeGym, getGymSnapshot, getGymServerSnapshot);
}

export function recordDrill(momentText: string, constraintId: string, dim: Dim, grade: number) {
  const next: GymDrill = { id: crypto.randomUUID(), at: Date.now(), momentText, constraintId, dim, grade };
  const all = [...getGymSnapshot(), next].slice(-200);
  localStorage.setItem(KEY, JSON.stringify(all));
  cache = null;
  listeners.forEach((cb) => cb());
}

/** Whether today's drill is already done (the daily cap). */
export function drillDoneToday(drills: GymDrill[], now = Date.now()): boolean {
  const today = new Date(now).toDateString();
  return drills.some((d) => new Date(d.at).toDateString() === today);
}

/** Consecutive days ending today/yesterday with a drill (feeds the XP multiplier). */
export function gymStreak(drills: GymDrill[], now = Date.now()): number {
  if (drills.length === 0) return 0;
  const days = new Set(drills.map((d) => new Date(d.at).toDateString()));
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** XP for a completed drill: below own-attempt XP so practice never outfarms real conversation. */
export function gymXP(streakIncludingToday: number): number {
  return streakIncludingToday >= 7 ? 12 : 8;
}
