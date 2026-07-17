import taxonomyJson from "./taxonomy.json";

export interface TaxonomyEntry {
  framework: string;
  technique: string;
  tagName: string;
  explanation: string;
  citation: string;
}

const entries = (taxonomyJson as { allowed: TaxonomyEntry[] }).allowed;

/** The gate's banlist, for client-side draft checks. Single-sourced from Backend taxonomy. */
export const bannedTerms = (taxonomyJson as { bannedTerms: string[] }).bannedTerms;

const byTag = new Map(entries.map((e) => [e.tagName, e]));

/** Why-this-works copy for a reply's psychology tag. Source of truth: Backend taxonomy (synced copy, never hand-edit). */
export function explain(tagName: string): TaxonomyEntry | undefined {
  return byTag.get(tagName);
}
