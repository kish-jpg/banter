"use client";

import { useCallback, useSyncExternalStore } from "react";
import { levelFor } from "./xp";

const KEY = "banter.xp";

// ponytail: localStorage-first XP (anonymous-first UX). Moves to Supabase user rows
// when auth lands; the award() seam stays identical.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => localStorage.getItem(KEY) ?? "0";
const getServerSnapshot = () => "0";

export function useXP() {
  const total = parseInt(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), 10) || 0;

  const award = useCallback((points: number) => {
    const next = (parseInt(localStorage.getItem(KEY) ?? "0", 10) || 0) + points;
    localStorage.setItem(KEY, String(next));
    listeners.forEach((cb) => cb());
  }, []);

  return { total, award, ...levelFor(total) };
}
