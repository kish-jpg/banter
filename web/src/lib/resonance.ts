"use client";

import { useSyncExternalStore } from "react";
import type { PersonaFact } from "./persona";
import type { SelfFact } from "./self";

// ponytail: keyword extraction duplicated from salience.ts — node --test can't
// resolve extensionless cross-imports and Next's tsc forbids .ts extensions.
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

/**
 * Resonance map (R3 C, PRD §7.2): computed compatibility, never horoscope.
 * - Locks: shared traits between the two personas, weighted by rarity — two
 *   non-drinkers weigh far more than two music likers. Every lock carries BOTH
 *   quotes; if it can't be traced to stated words, it doesn't exist.
 * - Tensions: boundary/values facts the user chose to track honestly
 *   (open / bridged / paused). Candidates are suggested, never auto-tracked.
 * Pure compute over the two fact sets + a small localStorage store for
 * tension states. banter.* prefix, wiped by delete-everything.
 */

// Static rarity table (decision on record: qualitative weights, no fabricated stats).
const RARITY: { re: RegExp; weight: number; tag: string }[] = [
  { re: /(non-?drinker|don'?t drink|no alcohol|sober|stopped drinking)/i, weight: 5, tag: "rare" },
  { re: /(vegetarian|pescatarian|vegan|no (pork|beef|meat)|plant-?based)/i, weight: 4, tag: "rare" },
  { re: /(overthink|introvert|anxious)/i, weight: 3, tag: "uncommon" },
  { re: /(no kids|child-?free|don'?t want (kids|children))/i, weight: 4, tag: "rare" },
  { re: /(dog|cat|pet|animal|bird|chicken|duck|turtle|horse)/i, weight: 2, tag: "shared" },
];

export interface Lock {
  label: string;
  weight: number;
  tag: string;
  selfQuote: string;
  matchQuote: string;
}

/** Shared-trait locks between chat-you and them, strongest first. */
export function computeLocks(self: SelfFact[], match: PersonaFact[], max = 6): Lock[] {
  const locks: Lock[] = [];
  for (const s of self) {
    const sWords = keywords(`${s.text} ${s.quote}`);
    for (const m of match) {
      const mWords = keywords(`${m.text} ${m.quote}`);
      let shared = 0;
      for (const w of sWords) if (mWords.has(w)) shared++;
      // A rarity pattern hitting BOTH sides is evidence on its own ("drinking"
      // vs "drinker" share no exact keyword); generic overlaps need 2+ words.
      const rarity = RARITY.find((r) => r.re.test(s.text) && r.re.test(m.text));
      if (!rarity && shared < 2) continue;
      locks.push({
        label: m.text.length <= s.text.length ? m.text : s.text,
        weight: (rarity?.weight ?? 1) * Math.max(1, shared),
        tag: rarity?.tag ?? "shared",
        selfQuote: s.quote,
        matchQuote: m.quote,
      });
    }
  }
  // One lock per label, strongest first.
  const seen = new Set<string>();
  return locks
    .sort((a, b) => b.weight - a.weight)
    .filter((l) => (seen.has(l.label) ? false : (seen.add(l.label), true)))
    .slice(0, max);
}

// ---- tension registry (tracked honestly, user-confirmed) ----

export type TensionState = "open" | "bridged" | "paused";

export interface Tension {
  id: string;
  personaId: string;
  /** The fact it derives from (receiver or self) — provenance. */
  factText: string;
  quote: string;
  state: TensionState;
  addedAt: number;
}

const KEY = "banter.tensions";
const DISMISSED_KEY = "banter.tensions.dismissed";

const listeners = new Set<() => void>();
let cache: Tension[] | null = null;

function read(): Tension[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Tension[];
  } catch {
    return [];
  }
}

function write(items: Tension[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  cache = null;
  listeners.forEach((cb) => cb());
}

export function subscribeTensions(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getTensionsSnapshot(): Tension[] {
  if (cache === null) cache = read();
  return cache;
}

const EMPTY: Tension[] = [];
export function getTensionsServerSnapshot(): Tension[] {
  return EMPTY;
}

export function useTensions(): Tension[] {
  return useSyncExternalStore(subscribeTensions, getTensionsSnapshot, getTensionsServerSnapshot);
}

/** Boundary/values facts not yet tracked or dismissed — suggested, never auto-added. */
export function tensionCandidates(
  match: PersonaFact[],
  tracked: Tension[],
  personaId: string,
): PersonaFact[] {
  const trackedTexts = new Set(tracked.filter((t) => t.personaId === personaId).map((t) => t.factText));
  let dismissed: string[] = [];
  try {
    dismissed = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
  } catch {}
  const dismissedSet = new Set(dismissed);
  return match.filter(
    (f) =>
      (f.type === "boundary" || f.type === "values") &&
      !trackedTexts.has(f.text) &&
      !dismissedSet.has(`${personaId}:${f.text}`),
  );
}

export function trackTension(personaId: string, fact: Pick<PersonaFact, "text" | "quote">) {
  write([
    ...getTensionsSnapshot(),
    {
      id: crypto.randomUUID(),
      personaId,
      factText: fact.text,
      quote: fact.quote,
      state: "open",
      addedAt: Date.now(),
    },
  ]);
}

export function dismissTensionCandidate(personaId: string, factText: string) {
  try {
    const dismissed = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
    dismissed.push(`${personaId}:${factText}`);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  } catch {}
  listeners.forEach((cb) => cb());
}

const NEXT_STATE: Record<TensionState, TensionState> = {
  open: "bridged",
  bridged: "paused",
  paused: "open",
};

export function cycleTension(id: string) {
  write(getTensionsSnapshot().map((t) => (t.id === id ? { ...t, state: NEXT_STATE[t.state] } : t)));
}

export function deleteTension(id: string) {
  write(getTensionsSnapshot().filter((t) => t.id !== id));
}
