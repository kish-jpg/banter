/**
 * Texting DNA archetypes (PRD §7.8, growth brief): 12 entries keyed by the user's
 * top two grading dimensions. Self-referential by design: the card describes YOU,
 * never the other person, so sharing it carries zero consent risk. Rarity cues are
 * qualitative texture, not fabricated stats. Pure functions.
 */

export type Dim = "warmth" | "specificity" | "reciprocity" | "naturalness";

export interface Archetype {
  name: string;
  tagline: string;
  strengths: [string, string];
  growth: string;
}

const STRENGTH_COPY: Record<Dim, string> = {
  warmth: "you make people feel met",
  specificity: "you notice the details that matter",
  reciprocity: "you keep it a two-way street",
  naturalness: "you sound like a person, not a script",
};

const GROWTH_COPY: Record<Dim, string> = {
  warmth: "let more of the care show",
  specificity: "name the detail, not just the vibe",
  reciprocity: "hand the mic back more often",
  naturalness: "less polish, more you",
};

const NAMES: Record<Dim, Record<Dim, [string, string]>> = {
  warmth: {
    warmth: ["", ""],
    specificity: ["The Rememberer", "warm and precise, a rare pairing"],
    reciprocity: ["The Safe Harbor", "people exhale around you"],
    naturalness: ["The Golden Hour", "easy warmth, zero performance"],
  },
  specificity: {
    warmth: ["The Detail Romantic", "you flirt in particulars"],
    specificity: ["", ""],
    reciprocity: ["The Curious One", "questions with receipts"],
    naturalness: ["The Storyteller", "concrete and effortless"],
  },
  reciprocity: {
    warmth: ["The Open Door", "generous with the mic"],
    specificity: ["The Rally Partner", "you keep the volley alive"],
    reciprocity: ["", ""],
    naturalness: ["The Easy Volley", "back-and-forth on instinct"],
  },
  naturalness: {
    warmth: ["The Easy Texter", "reads human at any hour"],
    specificity: ["The Slow Burner", "understated, then unforgettable"],
    reciprocity: ["The Banter Machine", "play first, always mutual"],
    naturalness: ["", ""],
  },
};

const DIM_ORDER: Dim[] = ["warmth", "specificity", "reciprocity", "naturalness"];

/** Archetype for a DNA reading (dims 1..5). Stable tie-breaking by DIM_ORDER. */
export function archetypeFor(dna: Record<Dim, number>): Archetype {
  const ranked = [...DIM_ORDER].sort((a, b) => dna[b] - dna[a]);
  const [top, second] = ranked;
  const lowest = ranked[ranked.length - 1];
  const [name, tagline] = NAMES[top][second];
  return {
    name,
    tagline,
    strengths: [STRENGTH_COPY[top], STRENGTH_COPY[second]],
    growth: GROWTH_COPY[lowest],
  };
}
