"use client";

import { useSyncExternalStore } from "react";
import { isSensitiveFact, type FactType } from "./persona";

/**
 * The user-self persona (R3 B, decision #3): who YOU are in chat, built from your
 * own messages under the same rules as receiver facts — stated words only, exact
 * quote, sensitive blocklist, fully visible and editable. Facts are tagged
 * per-relationship (personaId) or global (null). This is the "chat-you" model the
 * IRL Bridge trains real-you toward. banter.* prefix, wiped by delete-everything.
 */

export interface SelfFact {
  id: string;
  /** Relationship this surfaced in; null = global "you" (shows everywhere). */
  personaId: string | null;
  type: FactType;
  text: string;
  quote: string;
  source: "conversation" | "manual";
  addedAt: number;
}

const KEY = "banter.self";

const listeners = new Set<() => void>();
let cache: SelfFact[] | null = null;

function read(): SelfFact[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SelfFact[];
  } catch {
    return [];
  }
}

function write(facts: SelfFact[]) {
  localStorage.setItem(KEY, JSON.stringify(facts));
  cache = null;
  listeners.forEach((cb) => cb());
}

export function subscribeSelf(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSelfSnapshot(): SelfFact[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: SelfFact[] = [];
export function getSelfServerSnapshot(): SelfFact[] {
  return EMPTY;
}

export function useSelfFacts(): SelfFact[] {
  return useSyncExternalStore(subscribeSelf, getSelfSnapshot, getSelfServerSnapshot);
}

/** Facts relevant to one relationship: its own + the global ones. */
export function selfFactsFor(facts: SelfFact[], personaId: string | null): SelfFact[] {
  return facts.filter((f) => f.personaId === null || f.personaId === personaId);
}

/** Adds kept suggestions; same blocklist and near-duplicate rules as receiver facts. */
export function addSelfFacts(
  facts: Omit<SelfFact, "id" | "addedAt">[],
): number {
  const all = getSelfSnapshot();
  const existing = new Set(all.map((f) => f.text.toLowerCase().trim()));
  const fresh = facts
    .filter((f) => !isSensitiveFact(f.text) && !isSensitiveFact(f.quote))
    .filter((f) => !existing.has(f.text.toLowerCase().trim()))
    .map((f) => ({ ...f, id: crypto.randomUUID(), addedAt: Date.now() }));
  if (fresh.length === 0) return 0;
  write([...all, ...fresh]);
  return fresh.length;
}

export function updateSelfFact(id: string, text: string) {
  if (isSensitiveFact(text)) return;
  write(getSelfSnapshot().map((f) => (f.id === id ? { ...f, text } : f)));
}

export function deleteSelfFact(id: string) {
  write(getSelfSnapshot().filter((f) => f.id !== id));
}
