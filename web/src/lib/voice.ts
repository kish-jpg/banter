/**
 * The mirror (anti-chatfishing): fingerprint the voice of a set of texts on four
 * personality axes, then measure how far chat-you (the AI-leaning content you send)
 * has drifted from real-you (your own words). When the two fingerprints overlap,
 * the person they meet IS the person they've been texting. Pure heuristic — no
 * engine, offline, testable. Deeper voice-similarity via an LLM is a later refinement.
 */

export type VoiceAxis = "playful" | "elaborate" | "declarative" | "polished";
export const VOICE_AXES: VoiceAxis[] = ["playful", "elaborate", "declarative", "polished"];

export type Fingerprint = Record<VoiceAxis, number>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const LAUGH = /\b(a?ha(ha)+|lol|lmf?ao|hehe|teehee)\b/i;
// Emoji + common dingbats/symbols people text with.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
const CONTRACTION = /['’](s|t|re|ll|ve|d|m)\b/i;

function wordCount(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

/** Minimum sample before a fingerprint is trustworthy (cold-start guard). */
export const MIN_SAMPLE = 3;

/**
 * Fingerprint texts on the four axes, each 0..1. Null when there isn't enough to
 * read honestly (fewer than MIN_SAMPLE non-empty messages).
 */
export function fingerprint(texts: string[]): Fingerprint | null {
  const msgs = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (msgs.length < MIN_SAMPLE) return null;

  let playfulHits = 0;
  let questionHits = 0;
  let spontaneousHits = 0;
  let totalWords = 0;

  for (const m of msgs) {
    totalWords += wordCount(m);
    const exclaims = (m.match(/!/g) ?? []).length;
    if (EMOJI.test(m) || LAUGH.test(m) || exclaims >= 1) playfulHits++;
    if (m.includes("?")) questionHits++;

    // Spontaneity markers — the opposite of the AI's edited-prose tell.
    const first = m[0];
    const lowerStart = first === first.toLowerCase() && first !== first.toUpperCase();
    const standaloneLowerI = /\bi\b/.test(m); // lowercase "i" as a word
    const contraction = CONTRACTION.test(m);
    const noEndPunctuation = !/[.!?…]$/.test(m);
    if (lowerStart || standaloneLowerI || contraction || noEndPunctuation) spontaneousHits++;
  }

  const n = msgs.length;
  const avgWords = totalWords / n;

  return {
    playful: clamp01(playfulHits / n),
    // 3 words → 0, ~23 words → 1.
    elaborate: clamp01((avgWords - 3) / 20),
    // Many questions → curious (low); few → declarative (high).
    declarative: clamp01(1 - questionHits / n),
    // Lots of informal markers → spontaneous (low polished); clean prose → polished (high).
    polished: clamp01(1 - spontaneousHits / n),
  };
}

/** Normalized distance between two fingerprints, 0 (identical) .. 1 (opposite). */
export function divergence(a: Fingerprint, b: Fingerprint): number {
  let sum = 0;
  for (const k of VOICE_AXES) {
    const d = a[k] - b[k];
    sum += d * d;
  }
  return clamp01(Math.sqrt(sum) / 2); // max distance over 4 axes is sqrt(4) = 2
}

/** How aligned chat-you and real-you are, 0..1 (1 = you're being yourself). */
export function authenticity(real: Fingerprint, chat: Fingerprint): number {
  return 1 - divergence(real, chat);
}

export type AuthenticityBand = "not yet" | "getting there" | "this is you";

export function authenticityBand(score: number): AuthenticityBand {
  return score < 0.5 ? "not yet" : score < 0.78 ? "getting there" : "this is you";
}

const GAP_PHRASE: Record<VoiceAxis, { higher: string; lower: string }> = {
  elaborate: { higher: "more elaborate and long-winded", lower: "briefer and more clipped" },
  polished: { higher: "more polished and edited", lower: "looser and more casual" },
  playful: { higher: "more jokey", lower: "more earnest and plain" },
  declarative: { higher: "less curious, more declarative", lower: "more question-heavy" },
};

/**
 * The one plain-language nudge naming the widest gap (usually chat-you overshooting).
 * Null when the voices are close enough that there's nothing to flag.
 */
export function gapNudge(real: Fingerprint, chat: Fingerprint): string | null {
  let axis: VoiceAxis | null = null;
  let best = 0.12; // ignore trivial gaps
  for (const k of VOICE_AXES) {
    const d = Math.abs(chat[k] - real[k]);
    if (d > best) {
      best = d;
      axis = k;
    }
  }
  if (!axis) return null;
  const chatHigher = chat[axis] > real[axis];
  const phrase = chatHigher ? GAP_PHRASE[axis].higher : GAP_PHRASE[axis].lower;
  return `Chat-you runs ${phrase} than the real you. Your own best drafts sound like how you'd actually say it — keep writing them and the gap closes.`;
}

/** Share of what you send that's your own words, 0..1. */
export function reliance(ownCount: number, assistedCount: number): number {
  const total = ownCount + assistedCount;
  return total === 0 ? 0 : ownCount / total;
}

/**
 * Convenience for the readiness gate: authenticity for one person from raw text
 * sets. Null when either voice can't be read yet (cold start).
 */
export function voiceMatch(ownTexts: string[], assistedTexts: string[]): number | null {
  const real = fingerprint(ownTexts);
  const chat = fingerprint(assistedTexts);
  if (!real || !chat) return null;
  return authenticity(real, chat);
}
