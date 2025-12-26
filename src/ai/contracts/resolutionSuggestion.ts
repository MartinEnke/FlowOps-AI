// src/ai/prompts/resolutionSuggestion.ts

export const RESOLUTION_SUGGESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "string", enum: ["resolution_suggestion.v1"] },
    generatedAt: { type: "string" },
    handoffId: { type: "string" },

    suggestedCategory: {
      type: "string",
      enum: [
        "refund_possible",
        "refund_not_allowed",
        "billing_issue",
        "technical_issue",
        "account_access",
        "policy_exception",
        "needs_more_info",
        "escalate_to_supervisor",
        "other"
      ]
    },

    confidence: { type: "number", minimum: 0, maximum: 1 },

    uncertainties: {
      type: "array",
      minItems: 0,
      maxItems: 8,
      items: { type: "string", minLength: 8, maxLength: 180 }
    },

    keyFactsUsed: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: { type: "string", minLength: 5, maxLength: 180 }
    },

    suggestedInternalNotes: { type: "string", minLength: 30, maxLength: 1400 },

    // optional
    suggestedCustomerMessage: { type: "string", minLength: 40, maxLength: 1200 }
  },
  required: [
    "version",
    "generatedAt",
    "handoffId",
    "suggestedCategory",
    "confidence",
    "uncertainties",
    "keyFactsUsed",
    "suggestedInternalNotes"
  ]
} as const;

export function buildResolutionSuggestionPrompt(bundle: any) {
  const system =
    `You assist human operators by proposing a resolution direction for a case.\n` +
    `Rules:\n` +
    `- You do NOT resolve the case.\n` +
    `- You do NOT approve/deny refunds or policy exceptions.\n` +
    `- You ONLY use facts present in CONTEXT.\n` +
    `- If information is missing, choose suggestedCategory="needs_more_info".\n` +
    `- You MUST list uncertainties explicitly.\n` +
    `- Use plain English only. Do not mix languages.\n` +
    `- Output JSON only.\n`;

  const user =
    `CONTEXT (authoritative JSON):\n${JSON.stringify(bundle)}\n\n` +
    `Task:\n` +
    `Propose a resolution suggestion for the human operator to review.\n` +
    `Return:\n` +
    `- suggestedCategory (enum)\n` +
    `- confidence (0..1)\n` +
    `- uncertainties (what you cannot confirm from context)\n` +
    `- keyFactsUsed (short citations to the exact context facts you relied on)\n` +
    `- suggestedInternalNotes (operator-facing)\n` +
    `- suggestedCustomerMessage (optional)\n`;

  return { system, user };
}

export type ResolutionSuggestionV1 = {
  version: "resolution_suggestion.v1";
  generatedAt: string;
  handoffId: string;

  suggestedCategory:
    | "refund_possible"
    | "refund_not_allowed"
    | "billing_issue"
    | "technical_issue"
    | "account_access"
    | "policy_exception"
    | "needs_more_info"
    | "escalate_to_supervisor"
    | "other";

  confidence: number;
  uncertainties: string[];
  keyFactsUsed: string[];
  suggestedInternalNotes: string;
  suggestedCustomerMessage?: string;
};
