import type { TaxonomyEntry } from "../taxonomy.ts";
import { buildSystemInstruction, formatTranscript } from "../promptAssembly.ts";
import type { CoachingRequest, CoachingResponse, LLMProvider, OpenerRequest } from "./LLMProvider.ts";
import { COACHING_RESPONSE_SCHEMA, OPENER_RESPONSE_SCHEMA } from "./schema.ts";

// Pinned per RESEARCH Assumption A4: -image/-lite variants differ in structured-output
// support - do not substitute without re-verifying.
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractJsonText(data: any): string {
  return data.candidates[0].content.parts[0].text;
}

export class GeminiAdapter implements LLMProvider {
  constructor(private apiKey: string) {}

  async generateCoaching(
    req: CoachingRequest,
    allowedTags: TaxonomyEntry[],
  ): Promise<CoachingResponse> {
    const systemInstruction = buildSystemInstruction(allowedTags, req.tone);
    const contents = [{ role: "user", parts: [{ text: formatTranscript(req.transcript) }] }];

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: COACHING_RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return JSON.parse(extractJsonText(data)) as CoachingResponse;
  }

  async generateOpeners(
    req: OpenerRequest,
    allowedTags: TaxonomyEntry[],
  ): Promise<{ openers: CoachingResponse["replies"] }> {
    const systemInstruction = buildSystemInstruction(allowedTags);
    const contents = [
      {
        role: "user",
        parts: [{ text: `Match profile:\n${req.profileText}` }],
      },
    ];

    const response = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: OPENER_RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return JSON.parse(extractJsonText(data)) as { openers: CoachingResponse["replies"] };
  }
}
