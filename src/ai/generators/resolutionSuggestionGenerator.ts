import { buildHandoffContextBundle } from "../handoffContext";
import { ResolutionSuggestionV1 } from "../contracts/resolutionSuggestion";

function clamp01(n: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function isNonEmptyString(x: any) {
  return typeof x === "string" && x.trim().length > 0;
}

export function validateResolutionSuggestionV1(obj: any): ResolutionSuggestionV1 {
  if (!obj || obj.version !== "resolution_suggestion.v1") {
    throw new Error("Invalid version for resolution_suggestion.v1");
  }
  if (!isNonEmptyString(obj.generatedAt) || !isNonEmptyString(obj.handoffId)) {
    throw new Error("Missing generatedAt or handoffId");
  }
  if (!isNonEmptyString(obj.suggestedCategory)) {
    throw new Error("Missing suggestedCategory");
  }
  if (!Array.isArray(obj.uncertainties)) obj.uncertainties = [];
  if (!Array.isArray(obj.keyFactsUsed)) obj.keyFactsUsed = [];

  obj.confidence = clamp01(obj.confidence);

  if (!isNonEmptyString(obj.suggestedInternalNotes)) {
    throw new Error("Missing suggestedInternalNotes");
  }

  return obj as ResolutionSuggestionV1;
}

/**
 * IMPORTANT: Replace `callLLMJson` with whatever you already use for draft/risk generation.
 * The key is: model must output JSON that matches ResolutionSuggestionV1.
 */
export async function generateResolutionSuggestion(handoffId: string, callLLMJson: (prompt: string) => Promise<any>) {
  const context = await buildHandoffContextBundle(handoffId);

  const prompt = `
You are an operations assistant. You must produce a trustworthy resolution suggestion for a human operator.

RULES (must follow):
- Only use facts present in the provided context bundle.
- Do NOT invent details.
- Do NOT resolve automatically.
- Explicitly list uncertainties.
- If information is missing, prefer suggestedCategory = "needs_more_info".
- Provide internal notes. Customer message is optional.
- Output MUST be valid JSON only, no markdown.

OUTPUT SCHEMA (exact keys):
{
  "version": "resolution_suggestion.v1",
  "generatedAt": "<ISO datetime>",
  "handoffId": "<handoff id>",
  "suggestedCategory": "<one of: refund_possible, refund_not_allowed, billing_issue, technical_issue, account_access, policy_exception, needs_more_info, escalate_to_supervisor, other>",
  "confidence": <number 0..1>,
  "uncertainties": ["..."],
  "keyFactsUsed": ["..."],
  "suggestedInternalNotes": "...",
  "suggestedCustomerMessage": "..." // optional
}

CONTEXT BUNDLE (source of truth):
${JSON.stringify(context, null, 2)}
`.trim();

  const raw = await callLLMJson(prompt);
  const validated = validateResolutionSuggestionV1(raw);
  return validated;
}
