export type ResolutionCategory =
  | "refund_possible"
  | "refund_not_allowed"
  | "billing_issue"
  | "technical_issue"
  | "account_access"
  | "policy_exception"
  | "needs_more_info"
  | "escalate_to_supervisor"
  | "other";

export type ResolutionSuggestionV1 = {
  version: "resolution_suggestion.v1";
  generatedAt: string; // ISO
  handoffId: string;

  suggestedCategory: ResolutionCategory;

  // Must be explicit about confidence / uncertainty
  confidence: number; // 0..1
  uncertainties: string[];

  // Must only reference context bundle facts
  keyFactsUsed: string[];

  // For internal operator use
  suggestedInternalNotes: string;

  // Optional: customer-facing draft text (still must be reviewed)
  suggestedCustomerMessage?: string;
};
