import taxonomyData from "./taxonomy.json" with { type: "json" };

export interface TaxonomyEntry {
  framework: string;
  technique: string;
  tagName: string;
  explanation: string;
  citation: string;
}

export interface Taxonomy {
  version: string;
  allowed: TaxonomyEntry[];
  bannedTerms: string[];
}

export const taxonomy: Taxonomy = taxonomyData as Taxonomy;

export function allowedTagNames(): Set<string> {
  return new Set(taxonomy.allowed.map((e) => e.tagName));
}

export function containsBannedTerm(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of taxonomy.bannedTerms) {
    const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) return term;
  }
  return null;
}
