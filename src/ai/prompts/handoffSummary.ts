// src/ai/prompts/handoffSummary.ts

export const HANDOFF_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "string", enum: ["handoff_summary.v1"] },
    generatedAt: { type: "string" }, // ISO timestamp
    handoffId: { type: "string" },

    summaryText: { type: "string", minLength: 20, maxLength: 900 },

    keyFacts: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string", minLength: 5, maxLength: 140 }
    },

    risks: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: { type: "string", minLength: 5, maxLength: 140 }
    },

    recommendedHumanNextStep: {
      type: "string",
      minLength: 10,
      maxLength: 200
    }
  },
  required: ["version", "generatedAt", "handoffId", "summaryText", "keyFacts", "risks", "recommendedHumanNextStep"]
} as const;

export function buildHandoffSummaryPrompt(bundle: any) {
  const system =
    `You are a reliability-focused support-ops summarizer.\n` +
    `Rules:\n` +
    `- Only use facts provided in CONTEXT.\n` +
    `- If a fact is missing, say so in risks; do not invent.\n` +
    `- Output must be valid JSON matching the provided schema.\n` +
    `- Keep summary concise and operator-friendly.\n`;

  const user =
    `CONTEXT (authoritative JSON):\n` +
    `${JSON.stringify(bundle)}\n\n` +
    `Task:\n` +
    `Generate a human handoff summary for an operator.\n`;

  return { system, user };
}
