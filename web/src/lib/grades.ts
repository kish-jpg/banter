"use client";

import { useSyncExternalStore } from "react";
import type { GradeResponse } from "./types";

/**
 * Grade history: every own-attempt grade, persisted so /you can show skill
 * progression (Texting DNA) and the practice streak. localStorage, banter.*
 * prefix so delete-everything wipes it.
 */
export interface GradeRecord {
  at: number;
  overall: number;
  dims: { warmth: number; specificity: number; reciprocity: number; naturalness: number };
  /** Thread the attempt belonged to (additive; older records lack it). Feeds readiness. */
  threadId?: string;
  /** The user's own words (additive; older records lack it). Feeds the mirror's real-you voice. */
  text?: string;
}

const KEY = "banter.grades";

const listeners = new Set<() => void>();
let cache: GradeRecord[] | null = null;

function read(): GradeRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as GradeRecord[];
  } catch {
    return [];
  }
}

export function recordGrade(grade: GradeResponse, threadId?: string, text?: string) {
  const dims = { warmth: 3, specificity: 3, reciprocity: 3, naturalness: 3 };
  for (const d of grade.dimensions) {
    if (d.dimension in dims) dims[d.dimension as keyof typeof dims] = d.score;
  }
  const next = [
    ...read(),
    { at: Date.now(), overall: grade.overallScore, dims, ...(threadId ? { threadId } : {}), ...(text ? { text } : {}) },
  ];
  localStorage.setItem(KEY, JSON.stringify(next.slice(-200)));
  cache = null;
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): GradeRecord[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: GradeRecord[] = [];
const getServerSnapshot = () => EMPTY;

export function useGrades(): GradeRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Average of the last `n` grades per dimension, 1-5. Null when no history. */
export function textingDNA(grades: GradeRecord[], n = 10) {
  if (grades.length === 0) return null;
  const recent = grades.slice(-n);
  const sum = { warmth: 0, specificity: 0, reciprocity: 0, naturalness: 0 };
  for (const g of recent) {
    sum.warmth += g.dims.warmth;
    sum.specificity += g.dims.specificity;
    sum.reciprocity += g.dims.reciprocity;
    sum.naturalness += g.dims.naturalness;
  }
  const k = recent.length;
  return {
    warmth: sum.warmth / k,
    specificity: sum.specificity / k,
    reciprocity: sum.reciprocity / k,
    naturalness: sum.naturalness / k,
    count: grades.length,
  };
}

/** Consecutive days (ending today or yesterday) with at least one own attempt. */
export function practiceStreak(grades: GradeRecord[], now = Date.now()): number {
  if (grades.length === 0) return 0;
  const days = new Set(grades.map((g) => new Date(g.at).toDateString()));
  let streak = 0;
  const cursor = new Date(now);
  // A streak survives until you skip a full day: if nothing today yet, start counting
  // from yesterday so the streak isn't "broken" mid-day.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
