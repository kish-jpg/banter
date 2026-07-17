/**
 * Draft coach (PRD §7.4, F5): instant pre-send checks on the user's OWN draft,
 * client-side, before any network call. The case-study evidence: the user's final
 * edit made his message worse — the warmer unsent draft would have scored higher.
 * These checks warn, never block: the deep read is the existing grade round-trip.
 * Pure functions, no I/O. Banned terms are injected by the caller (lib/taxonomy
 * stays the single JSON touchpoint; node --test can't import JSON without attributes).
 */

export type DraftCheckKind = "banned" | "stacking" | "frame" | "ai-tell";

export interface DraftCheck {
  kind: DraftCheckKind;
  note: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Frame classifier (case study §3.3): prize-framing — "my best positions are earned" —
 * flips play into hierarchy right when they were matching you beat for beat.
 * ponytail: regex heuristics for the clearest patterns only; LLM frame classification
 * rides along with the grade round-trip when Framework Library v2 lands (R3).
 */
const FRAME_PATTERNS = [
  /(?:\b(?:is|are|be|being|been|get|gets)\s+|'re\s+)earned\b/i,
  /\bearn\s+(it|that|the right|your (way|place|spot))\b/i,
  /\bprove\s+(yourself|it to me|you'?re worth)\b/i,
  /\b(you'?d|you'?ll|you would) be lucky\b/i,
  /\bif you'?re lucky\b/i,
  /\blucky to (have|get|know) me\b/i,
  /\bdeserve me\b/i,
  /\bworthy of (me|my)\b/i,
];

const STACKING_NOTE =
  "two questions in one text — they'll answer one and drop the other. keep the one you actually care about.";
const FRAME_NOTE =
  "this frames you as the prize and them as the applicant. if you two were playing equals, hand the bit back instead of claiming the win.";
const EM_DASH_NOTE =
  "an em-dash reads polished, not texted. a comma or two short messages feels more human.";
const SEMICOLON_NOTE =
  "a semicolon in a text reads like an essay. split it into two messages.";

/** All checks for one draft. Empty array = clean. Order: worst first. */
export function checkDraft(text: string, bannedTerms: string[]): DraftCheck[] {
  const checks: DraftCheck[] = [];

  for (const term of bannedTerms) {
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text)) {
      checks.push({
        kind: "banned",
        note: `"${term}" is manipulation vocabulary — that's not the game we're playing.`,
      });
      break;
    }
  }

  if (FRAME_PATTERNS.some((re) => re.test(text))) {
    checks.push({ kind: "frame", note: FRAME_NOTE });
  }

  // Question stacking (case study §3.4): "?" groups, so "??" counts once.
  if ((text.match(/\?+/g) ?? []).length > 1) {
    checks.push({ kind: "stacking", note: STACKING_NOTE });
  }

  if (text.includes("—")) {
    checks.push({ kind: "ai-tell", note: EM_DASH_NOTE });
  } else if (/\w;\s/.test(text)) {
    checks.push({ kind: "ai-tell", note: SEMICOLON_NOTE });
  }

  return checks;
}
