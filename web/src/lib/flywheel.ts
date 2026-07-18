"use client";

import { useSyncExternalStore } from "react";
import type { Sentiment } from "./types";

/**
 * Outcome attribution (R3 G, PRD §5.7): the loop that makes the app learn.
 * After the user sends a reply and the match responds, we score that round by
 * how they actually responded — did they warm up, write more, ask back? The
 * persona facts injected into that round inherit the score. Facts that land get
 * promoted in salience; facts that flop sink. Measured, per relationship, not
 * guessed. Surfaced honestly (persona panel shows landed/flopped) — nothing
 * invisible shapes the coaching. banter.* prefix, wiped by delete-everything.
 * The log is also the future training set for a real reranker (R4+).
 */

export interface FactScore {
  factId: string;
  personaId: string;
  score: number;
}

/**
 * Response delta in roughly [-1, 1]: how much better (or worse) the match's
 * reply landed versus the previous read. Blends the signal shift with two
 * concrete behaviours — they wrote more, they asked back.
 */
export function responseDelta(
  prev: Sentiment,
  next: Sentiment,
  prevMatchText: string,
  nextMatchText: string,
): number {
  const investment = (s: Sentiment) => (s.factors.interest + s.factors.reciprocity + s.factors.warmth) / 3;
  const signalShift = investment(next) - investment(prev); // ~[-1, 1]

  const prevLen = Math.max(1, prevMatchText.trim().length);
  const lenRatio = nextMatchText.trim().length / prevLen;
  const lengthSignal = Math.max(-0.5, Math.min(0.5, (lenRatio - 1) * 0.5));

  const askedBack = /\?/.test(nextMatchText) ? 0.2 : 0;

  return Math.max(-1, Math.min(1, signalShift * 0.6 + lengthSignal * 0.3 + askedBack));
}

const KEY = "banter.flywheel";

const listeners = new Set<() => void>();
let cache: FactScore[] | null = null;

function read(): FactScore[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as FactScore[];
  } catch {
    return [];
  }
}

function write(scores: FactScore[]) {
  localStorage.setItem(KEY, JSON.stringify(scores));
  cache = null;
  listeners.forEach((cb) => cb());
}

export function subscribeFlywheel(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getFlywheelSnapshot(): FactScore[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: FactScore[] = [];
export function getFlywheelServerSnapshot(): FactScore[] {
  return EMPTY;
}

export function useFlywheel(): FactScore[] {
  return useSyncExternalStore(subscribeFlywheel, getFlywheelSnapshot, getFlywheelServerSnapshot);
}

/** Applies a round's delta to each fact injected that round, accumulating (bounded ±3). */
export function scoreFacts(personaId: string, factIds: string[], delta: number) {
  if (factIds.length === 0 || delta === 0) return;
  const byId = new Map(getFlywheelSnapshot().map((s) => [s.factId, s]));
  for (const factId of factIds) {
    const cur = byId.get(factId)?.score ?? 0;
    byId.set(factId, { factId, personaId, score: Math.max(-3, Math.min(3, cur + delta)) });
  }
  write([...byId.values()]);
}

/** Salience boost map for a persona: factId → accumulated score (fed to selectFacts). */
export function scoreMapFor(scores: FactScore[], personaId: string): Map<string, number> {
  return new Map(scores.filter((s) => s.personaId === personaId).map((s) => [s.factId, s.score]));
}

/** Human-facing verdict for a fact's score: shown in the persona panel (transparency). */
export function landedLabel(score: number | undefined): "landed" | "flopped" | null {
  if (score === undefined || Math.abs(score) < 0.25) return null;
  return score > 0 ? "landed" : "flopped";
}
