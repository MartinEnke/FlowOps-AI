export const REPLY_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "string", enum: ["reply_draft.v1"] },
    generatedAt: { type: "string" },
    handoffId: { type: "string" },

    draftText: { type: "string", minLength: 40, maxLength: 1200 },

    tone: { type: "string", enum: ["neutral", "empathetic", "concise"] },

    citations: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", minLength: 5, maxLength: 140 }
    },

    disclaimers: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: { type: "string", minLength: 5, maxLength: 160 }
    }
  },
  required: ["version", "generatedAt", "handoffId", "draftText", "tone", "citations", "disclaimers"]
} as const;

export function buildReplyDraftPrompt(bundle: any) {
  const system =
    `You draft customer support replies for a human operator.\n` +
    `Rules:\n` +
    `- Do NOT promise actions you cannot verify from CONTEXT.\n` +
    `- Only use facts in CONTEXT.\n` +
    `- If uncertain, say "I will confirm" instead of inventing.\n` +
    `- Output JSON only.\n`;

  const user =
    `CONTEXT (authoritative JSON):\n${JSON.stringify(bundle)}\n\n` +
    `Task:\nDraft a customer-facing reply the human operator can approve.\n` +
    `Include citations that point to which facts you used (short bullet-like strings).\n`;

  return { system, user };
}
