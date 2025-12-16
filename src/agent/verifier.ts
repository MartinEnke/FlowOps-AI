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
  const { replyDraft, account, billing, claimedRefund } = input;

  // Basic “fact presence” checks
  if (replyDraft.includes("Plan:") && !replyDraft.includes(account.plan)) {
    issues.push("Reply mentions plan but not the correct plan value.");
  }

  if (replyDraft.includes("API key:") && !replyDraft.includes(account.apiKeyStatus)) {
    issues.push("Reply mentions API key status but does not match tool output.");
  }

  if (replyDraft.includes("Last invoice:") && !replyDraft.includes(billing.lastInvoiceId)) {
    issues.push("Reply mentions last invoice but does not match tool output.");
  }

  if (replyDraft.includes(billing.invoiceStatus) === false && replyDraft.includes("Last invoice:")) {
    issues.push("Reply mentions invoice but does not include correct invoice status.");
  }

  // Refund claim sanity checks
  if (claimedRefund) {
    const { approved, amount } = claimedRefund;

    if (approved && amount > billing.refundableAmount) {
      issues.push(`Refund amount claim (€${amount}) exceeds refundableAmount (€${billing.refundableAmount}).`);
    }

    // If reply says approved but doesn’t contain the amount, that’s suspicious
    if (approved && !replyDraft.includes(`€${amount}`)) {
      issues.push("Reply claims refund approval but does not include the approved amount.");
    }
  }

  return { passed: issues.length === 0, issues };
}
