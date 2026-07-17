"use client";

import { useSyncExternalStore } from "react";
import type { PersonaFact } from "./persona";

/**
 * Spaced fact quiz (PRD §7.5): her order, Ruby, Topaz, off-Mondays — to COLD memory,
 * spaced over days, not crammed the night before. Leitner boxes with the learning-
 * science intervals from the PRD: 1d → 3d → 7d → 14d. Pure core (testable, caller
 * passes `now`), thin localStorage store around it. banter.* prefix, wiped by clearAll.
 */

export const INTERVAL_DAYS = [1, 3, 7, 14] as const;
const DAY_MS = 86_400_000;

export interface QuizState {
  factId: string;
  personaId: string;
  /** Leitner box 0..3; box index selects the next interval. */
  box: number;
  due: number;
  reps: number;
  lapses: number;
}

/** Facts due for drilling now: overdue reviews first, then never-drilled facts. Max k. */
export function dueCards(
  facts: PersonaFact[],
  states: QuizState[],
  now: number,
  k = 5,
): PersonaFact[] {
  const byFact = new Map(states.map((s) => [s.factId, s]));
  const reviews = facts
    .filter((f) => {
      const s = byFact.get(f.id);
      return s !== undefined && s.due <= now;
    })
    .sort((a, b) => (byFact.get(a.id)?.due ?? 0) - (byFact.get(b.id)?.due ?? 0));
  const fresh = facts.filter((f) => !byFact.has(f.id));
  return [...reviews, ...fresh].slice(0, k);
}

/** One answer: knew it → next box; missed → back to box 0 and due tomorrow. */
export function applyAnswer(
  states: QuizState[],
  fact: Pick<PersonaFact, "id">,
  personaId: string,
  knewIt: boolean,
  now: number,
): QuizState[] {
  const prev = states.find((s) => s.factId === fact.id);
  const box = knewIt ? Math.min(INTERVAL_DAYS.length - 1, (prev?.box ?? -1) + 1) : 0;
  const next: QuizState = {
    factId: fact.id,
    personaId,
    box,
    due: now + INTERVAL_DAYS[box] * DAY_MS,
    reps: (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (knewIt ? 0 : 1),
  };
  return [...states.filter((s) => s.factId !== fact.id), next];
}

/** Fraction of a persona's facts recalled cold (box ≥ 2 = held across a week+). 0 when no facts. */
export function quizMastery(facts: PersonaFact[], states: QuizState[]): number {
  if (facts.length === 0) return 0;
  const byFact = new Map(states.map((s) => [s.factId, s]));
  const cold = facts.filter((f) => (byFact.get(f.id)?.box ?? 0) >= 2).length;
  return cold / facts.length;
}

// ---- store plumbing ----

const KEY = "banter.quiz";

const listeners = new Set<() => void>();
let cache: QuizState[] | null = null;

function read(): QuizState[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QuizState[];
  } catch {
    return [];
  }
}

export function subscribeQuiz(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getQuizSnapshot(): QuizState[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: QuizState[] = [];
export function getQuizServerSnapshot(): QuizState[] {
  return EMPTY;
}

export function useQuizStates(): QuizState[] {
  return useSyncExternalStore(subscribeQuiz, getQuizSnapshot, getQuizServerSnapshot);
}

export function recordAnswer(fact: Pick<PersonaFact, "id">, personaId: string, knewIt: boolean) {
  const next = applyAnswer(getQuizSnapshot(), fact, personaId, knewIt, Date.now());
  localStorage.setItem(KEY, JSON.stringify(next));
  cache = null;
  listeners.forEach((cb) => cb());
}
