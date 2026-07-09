"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Light user profile (spec item 5): captured AFTER first value moment, injected
 * into prompts as a plain profileSummary string. Profile OF the user only —
 * never of any match (no-dossier boundary). localStorage, wiped by clearAll.
 */
export interface Profile {
  goal: string; // e.g. "dating apps" | "someone specific" | "general social"
  style: string; // e.g. "playful" | "dry" | "warm" | "direct"
  note: string; // free text, optional
  /** style -> times a reply of that style was copied; drifts prompts toward the user's voice */
  pickedStyles: Record<string, number>;
  dismissed: boolean;
}

const KEY = "banter.profile";
const EMPTY: Profile = { goal: "", style: "", note: "", pickedStyles: {}, dismissed: false };

const listeners = new Set<() => void>();
let cache: Profile | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Profile {
  if (cache === null) {
    try {
      cache = { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") } as Profile;
    } catch {
      cache = EMPTY;
    }
  }
  return cache ?? EMPTY;
}

const getServerSnapshot = () => EMPTY;

function write(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
  cache = null;
  listeners.forEach((cb) => cb());
}

/** Renders the profile as the prompt-injectable summary string (empty string = send nothing). */
export function summarize(p: Profile): string {
  const parts: string[] = [];
  if (p.goal) parts.push(`context: ${p.goal}`);
  if (p.style) parts.push(`their natural texting style: ${p.style}`);
  const picked = Object.entries(p.pickedStyles).sort((a, b) => b[1] - a[1]);
  if (picked.length > 0 && picked[0][1] >= 2) {
    parts.push(`they tend to pick ${picked[0][0]} replies`);
  }
  if (p.note) parts.push(`they add: ${p.note.slice(0, 200)}`);
  return parts.join(". ");
}

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const save = useCallback((patch: Partial<Profile>) => {
    write({ ...getSnapshot(), ...patch });
  }, []);

  const recordPick = useCallback((style: string) => {
    const p = getSnapshot();
    write({ ...p, pickedStyles: { ...p.pickedStyles, [style]: (p.pickedStyles[style] ?? 0) + 1 } });
  }, []);

  return { profile, save, recordPick, summary: summarize(profile) };
}
