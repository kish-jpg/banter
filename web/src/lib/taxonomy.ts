import taxonomyJson from "./taxonomy.json";

export interface TaxonomyEntry {
  framework: string;
  technique: string;
  tagName: string;
  explanation: string;
  citation: string;
}

const entries = (taxonomyJson as { allowed: TaxonomyEntry[] }).allowed;

const byTag = new Map(entries.map((e) => [e.tagName, e]));

/** Why-this-works copy for a reply's psychology tag. Source of truth: Backend taxonomy (synced copy, never hand-edit). */
export function explain(tagName: string): TaxonomyEntry | undefined {
  return byTag.get(tagName);
}
