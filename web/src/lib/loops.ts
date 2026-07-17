"use client";

import { useSyncExternalStore } from "react";

/**
 * Open-loop ledger + authenticity debt (PRD §7.3/§7.5, case-study F4). Loops are
 * promises with an owner: stories promised, plans seeded, running bits, claims made
 * while assisted. User-owned story/claim loops ARE the debt list — the things
 * real-you must own in person. Same provenance rules as persona facts: every loop
 * carries the quote it came from. localStorage, banter.* prefix (wiped by clearAll).
 */

export type LoopKind = "story" | "plan" | "bit" | "claim";
export type LoopOwner = "user" | "match" | "mutual";
export type LoopStatus = "open" | "owned" | "closed" | "dismissed";

export interface LoopItem {
  id: string;
  personaId: string;
  threadId: string;
  kind: LoopKind;
  owner: LoopOwner;
  text: string;
  quote: string;
  status: LoopStatus;
  addedAt: number;
  resolvedAt: number | null;
}

const KEY = "banter.loops";

const listeners = new Set<() => void>();
let cache: LoopItem[] | null = null;

function read(): LoopItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as LoopItem[];
  } catch {
    return [];
  }
}

function write(loops: LoopItem[]) {
  localStorage.setItem(KEY, JSON.stringify(loops));
  cache = null;
  listeners.forEach((cb) => cb());
}

export function subscribeLoops(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getLoopsSnapshot(): LoopItem[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: LoopItem[] = [];
export function getLoopsServerSnapshot(): LoopItem[] {
  return EMPTY;
}

export function useLoops(): LoopItem[] {
  return useSyncExternalStore(subscribeLoops, getLoopsSnapshot, getLoopsServerSnapshot);
}

/** Adds suggested loops the user kept, skipping near-duplicate texts per persona. */
export function addLoops(
  loops: Omit<LoopItem, "id" | "addedAt" | "status" | "resolvedAt">[],
): number {
  const all = getLoopsSnapshot();
  const existing = new Set(all.map((l) => `${l.personaId}:${l.text.toLowerCase().trim()}`));
  const fresh = loops
    .filter((l) => !existing.has(`${l.personaId}:${l.text.toLowerCase().trim()}`))
    .map((l) => ({
      ...l,
      id: crypto.randomUUID(),
      status: "open" as LoopStatus,
      addedAt: Date.now(),
      resolvedAt: null,
    }));
  if (fresh.length === 0) return 0;
  write([...all, ...fresh]);
  return fresh.length;
}

export function setLoopStatus(id: string, status: LoopStatus) {
  write(
    getLoopsSnapshot().map((l) =>
      l.id === id
        ? { ...l, status, resolvedAt: status === "open" ? null : Date.now() }
        : l,
    ),
  );
}

/** Loops still to close for a persona (the pre-date checklist). */
export function openLoops(loops: LoopItem[], personaId: string): LoopItem[] {
  return loops.filter((l) => l.personaId === personaId && (l.status === "open" || l.status === "owned"));
}

/**
 * The debt list: user-owned stories and claims — assisted promises real-you must be
 * able to deliver in person. "owned" = rehearsed and ready, still to be delivered.
 */
export function debtList(loops: LoopItem[], personaId: string): LoopItem[] {
  return loops.filter(
    (l) =>
      l.personaId === personaId &&
      l.owner === "user" &&
      (l.kind === "story" || l.kind === "claim") &&
      l.status !== "dismissed" &&
      l.status !== "closed",
  );
}

/** Running bits — the relationship's shared property, the date's safety net. */
export function bitsAlive(loops: LoopItem[], personaId: string): LoopItem[] {
  return loops.filter(
    (l) => l.personaId === personaId && l.kind === "bit" && l.status !== "dismissed" && l.status !== "closed",
  );
}
