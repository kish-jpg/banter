import type { TaxonomyEntry } from "./taxonomy.ts";
import type { TranscriptEntry } from "./llm/LLMProvider.ts";

/**
 * Builds the Gemini system instruction: injects ONLY allowlisted tag vocabulary
 * (the prompt end of the D-01 gate), then states the five anti-AI-tell directives
 * mirroring validate.ts's checks one-for-one (defense-in-depth, not the gate itself
 * - see RESEARCH Anti-Patterns). Directives are phrased to avoid the construction,
 * never quoting it literally, so this file never trips validate.ts's own negative
 * greps for em dash / semicolon.
 */
export function buildSystemInstruction(allowedTags: TaxonomyEntry[], tone?: string): string {
  const tagList = allowedTags
    .map((t) => `- "${t.tagName}" (${t.framework}): ${t.explanation}`)
    .join("\n");

  const toneLine = tone ? `\nBias the tone of all three replies toward: ${tone}.` : "";

  return `You are a texting coach. Generate exactly 3 reply options for the user's dating
conversation, each grounded in ONE of the following evidence-based techniques only -
never invent a tag name outside this list:

${tagList}

Style rules (hard constraints):
1. Do not use the horizontal dash punctuation mark that joins two clauses in a single sentence - write two shorter sentences instead.
2. Do not join two independent clauses with a semicolon - split them into separate sentences.
3. Do not use a contrastive "not just one thing, but also another" rhetorical construction.
4. Do not list three parallel items in a row (a rule-of-three construction) - keep phrasing single-threaded.
5. Write each reply as if a real person typed it and sent it with minor imperfections, not as polished, edited prose - edited-not-copied, never over-formal.${toneLine}`;
}

/** Sorts a transcript by order and renders speaker-attributed lines for the Gemini prompt body. */
export function formatTranscript(transcript: TranscriptEntry[]): string {
  return [...transcript]
    .sort((a, b) => a.order - b.order)
    .map((entry) => `${entry.speaker === "user" ? "You" : "Match"}: ${entry.text}`)
    .join("\n");
}
