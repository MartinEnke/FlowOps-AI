import { Plan } from "./policy";

export type VerificationInput = {
  replyDraft: string;
  account: {
    plan: Plan;
    apiKeyStatus: "active" | "revoked" | "expired";
    email: string;
  };
  billing: {
    lastInvoiceId: string;
    invoiceStatus: "paid" | "open" | "void";
    refundableAmount: number;
  };
  claimedRefund?: {
    approved: boolean;
    amount: number;
    needsHuman: boolean;
  };
};

export type VerificationResult = {
  passed: boolean;
  issues: string[];
};

export function verifyReply(input: VerificationInput): VerificationResult {
  const issues: string[] = [];

  const {
    replyDraft,
    account,
    billing,
    claimedRefund
  } = input;

  // Normalize once for safer matching
  const draft = replyDraft.toLowerCase();

  // --- Account checks ---
  if (draft.includes("plan:") && !draft.includes(account.plan.toLowerCase())) {
    issues.push("Reply mentions plan but does not match the account plan.");
  }

  if (
    draft.includes("api key") &&
    !draft.includes(account.apiKeyStatus.toLowerCase())
  ) {
    issues.push("Reply mentions API key status but does not match tool output.");
  }

  // --- Billing checks ---
  if (
    draft.includes("last invoice") &&
    !draft.includes(billing.lastInvoiceId.toLowerCase())
  ) {
    issues.push("Reply mentions last invoice but invoice ID does not match.");
  }

  if (
    draft.includes("last invoice") &&
    !draft.includes(billing.invoiceStatus.toLowerCase())
  ) {
    issues.push("Reply mentions invoice but does not include correct invoice status.");
  }

  // --- Refund sanity checks ---
  if (claimedRefund) {
    const { approved, amount } = claimedRefund;

    if (approved && amount > billing.refundableAmount) {
      issues.push(
        `Refund amount (€${amount}) exceeds refundable amount (€${billing.refundableAmount}).`
      );
    }

    if (approved && !draft.includes(`€${amount}`)) {
      issues.push(
        "Reply claims refund approval but does not include the approved amount."
      );
    }

    if (!approved && draft.includes("refund") && draft.includes("approved")) {
      issues.push(
        "Reply suggests refund approval but refund was not approved."
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues
  };
}
