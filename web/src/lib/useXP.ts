"use client";

import { useCallback, useEffect, useState } from "react";
import { levelFor } from "./xp";

const KEY = "banter.xp";

// ponytail: localStorage-first XP (anonymous-first UX). Moves to Supabase user rows
// when auth lands; the award() seam stays identical.
export function useXP() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setTotal(parseInt(raw, 10) || 0);
  }, []);

  const award = useCallback((points: number) => {
    setTotal((prev) => {
      const next = prev + points;
      localStorage.setItem(KEY, String(next));
      return next;
    });
  }, []);

  return { total, award, ...levelFor(total) };
}
