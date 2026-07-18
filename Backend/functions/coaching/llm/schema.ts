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
    conversationType: { type: "STRING", enum: ["practical", "emotional", "social"] },
    typeMismatch: { type: "BOOLEAN" },
  },
  required: ["score", "factors", "signal", "conversationType", "typeMismatch"],
  propertyOrdering: ["score", "factors", "signal", "conversationType", "typeMismatch"],
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

// Per 06-RESEARCH: reasoning BEFORE score inside each dimension (propertyOrdering
// controls generation order - reasoning-first reduces judge variance).
const GRADE_DIMENSION_SCHEMA = {
  type: "OBJECT",
  properties: {
    dimension: { type: "STRING", enum: ["warmth", "specificity", "reciprocity", "naturalness"] },
    reasoning: { type: "STRING" },
    score: { type: "NUMBER" },
  },
  required: ["dimension", "reasoning", "score"],
  propertyOrdering: ["dimension", "reasoning", "score"],
};

export const GRADE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    dimensions: {
      type: "ARRAY",
      minItems: 4,
      maxItems: 4,
      items: GRADE_DIMENSION_SCHEMA,
    },
    overallScore: { type: "NUMBER" },
    strengthNote: { type: "STRING" },
    improvementNote: { type: "STRING" },
    citedTag: { type: "STRING" },
  },
  required: ["dimensions", "overallScore", "strengthNote", "improvementNote", "citedTag"],
  propertyOrdering: ["dimensions", "overallScore", "strengthNote", "improvementNote", "citedTag"],
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
