// src/ai/prompts/riskAssessment.ts

export const RISK_ASSESSMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "string", enum: ["risk_assessment.v1"] },
    generatedAt: { type: "string" },
    handoffId: { type: "string" },

    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high"]
    },

    reasons: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string", minLength: 10, maxLength: 160 }
    },

    attentionFlags: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: {
        type: "string",
        enum: [
          "sla_near_breach",
          "ambiguous_customer_intent",
          "policy_edge_case",
          "missing_information",
          "repeat_escalation",
          "financial_sensitivity"
        ]
      }
    }
  },
  required: [
    "version",
    "generatedAt",
    "handoffId",
    "riskLevel",
    "reasons",
    "attentionFlags"
  ]
} as const;

export function buildRiskAssessmentPrompt(bundle: any) {
  const system =
    `You assist human operators by highlighting potential operational risk.\n` +
    `Rules:\n` +
    `- You do NOT make decisions.\n` +
    `- You do NOT approve or deny actions.\n` +
    `- You ONLY assess risk based on provided CONTEXT.\n` +
    `- If uncertain, choose lower risk.\n` +
    `- Use plain English only.\n` +
    `- Do not mix languages.\n`+
    `- Output JSON only.\n`;

  const user =
    `CONTEXT (authoritative JSON):\n${JSON.stringify(bundle)}\n\n` +
    `Task:\nAssess the potential operational risk of this handoff.\n` +
    `Explain your reasoning clearly for a human operator.\n`;

  return { system, user };
}
