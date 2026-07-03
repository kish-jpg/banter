// Gemini-dialect responseSchema objects (STRING/NUMBER/OBJECT/ARRAY type names,
// propertyOrdering hint). These are NOT standard JSON Schema and must NOT be
// reused verbatim by another provider adapter (RESEARCH Pitfall 3) - import
// ONLY from GeminiAdapter.ts.

const REPLY_ITEM_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    psychologyTag: { type: "STRING" },
    style: { type: "STRING", enum: ["playful", "sincere", "witty", "direct"] },
  },
  required: ["text", "psychologyTag", "style"],
  propertyOrdering: ["text", "psychologyTag", "style"],
};

const SENTIMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "NUMBER" },
    factors: {
      type: "OBJECT",
      properties: {
        interest: { type: "NUMBER" },
        reciprocity: { type: "NUMBER" },
        warmth: { type: "NUMBER" },
        responsiveness: { type: "NUMBER" },
      },
      required: ["interest", "reciprocity", "warmth", "responsiveness"],
      propertyOrdering: ["interest", "reciprocity", "warmth", "responsiveness"],
    },
    signal: { type: "STRING" },
  },
  required: ["score", "factors", "signal"],
  propertyOrdering: ["score", "factors", "signal"],
};

export const COACHING_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    replies: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: REPLY_ITEM_SCHEMA,
    },
    sentiment: SENTIMENT_SCHEMA,
  },
  required: ["replies", "sentiment"],
  propertyOrdering: ["replies", "sentiment"],
};

export const OPENER_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    openers: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: REPLY_ITEM_SCHEMA,
    },
  },
  required: ["openers"],
  propertyOrdering: ["openers"],
};
