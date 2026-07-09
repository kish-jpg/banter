/**
 * Deterministic XP/leveling per 06-RESEARCH GROW-02: own-attempt quality beats
 * copy-paste, near-duplicates of shown suggestions count as copies (checked
 * client-side BEFORE any grade round-trip). Pure functions, no I/O.
 */

const COPY_XP = 5;
const OWN_ATTEMPT_BASE_XP = 20;

function trigrams(s: string): Set<string> {
  const t = s.toLowerCase().replace(/\s+/g, " ").trim();
  const grams = new Set<string>();
  for (let i = 0; i <= t.length - 3; i++) grams.add(t.slice(i, i + 3));
  return grams;
}

/** Jaccard trigram similarity, 0..1. Catches "pasted the suggestion verbatim-ish". */
export function similarity(a: string, b: string): number {
  const ga = trigrams(a);
  const gb = trigrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

export function isNearDuplicate(attempt: string, suggestions: string[], threshold = 0.6): boolean {
  return suggestions.some((s) => similarity(attempt, s) >= threshold);
}

/** XP for copying a suggested reply. */
export function copyXP(): number {
  return COPY_XP;
}

/** XP for an own attempt: base scaled by grade quality; near-duplicates earn copy XP only. */
export function attemptXP(overallScore: number, wasNearDuplicate: boolean): number {
  if (wasNearDuplicate) return COPY_XP;
  const clamped = Math.min(5, Math.max(1, overallScore));
  return Math.round(OWN_ATTEMPT_BASE_XP * (clamped / 5) * 2); // 8..40, always > copy
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

/** Level + progress for a cumulative XP total. Level starts at 1. */
export function levelFor(totalXP: number): { level: number; into: number; toNext: number } {
  let level = 1;
  let remaining = totalXP;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, into: remaining, toNext: xpToNext(level) };
}
