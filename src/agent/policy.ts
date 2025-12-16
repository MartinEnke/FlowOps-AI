export type Plan = "free" | "pro" | "enterprise";

export const policy = {
  refund: {
    maxAutoRefund: 100,
    allowedWindowDays: 30,
    enterpriseRequiresHuman: true
  },
  escalation: {
    confidenceThreshold: 0.75,
    highRiskPlans: ["enterprise"] as const
  }
} as const;

export function decideRefund(params: { plan: Plan; refundableAmount: number }) {
  const { plan, refundableAmount } = params;

  if (refundableAmount <= 0) {
    return { allow: false, needsHuman: false, maxAmount: 0, reason: "No refundable amount available." };
  }

  if (plan === "enterprise" && policy.refund.enterpriseRequiresHuman) {
    return {
      allow: true,
      needsHuman: true,
      maxAmount: Math.min(refundableAmount, policy.refund.maxAutoRefund),
      reason: "Enterprise refunds require human approval."
    };
  }

  if (refundableAmount > policy.refund.maxAutoRefund) {
    return {
      allow: true,
      needsHuman: true,
      maxAmount: policy.refund.maxAutoRefund,
      reason: `Refund exceeds €${policy.refund.maxAutoRefund}. Human approval required.`
    };
  }

  return {
    allow: true,
    needsHuman: false,
    maxAmount: refundableAmount,
    reason: "Refund is within auto-approval limits."
  };
}

export function shouldEscalate(params: { plan: Plan; confidence: number; verificationPassed: boolean }) {
  const { plan, confidence, verificationPassed } = params;

  if (!verificationPassed) {
    return { escalate: true, reason: "Verification failed. Escalating to a human." };
  }

  if (confidence < policy.escalation.confidenceThreshold) {
    return { escalate: true, reason: `Low confidence (${confidence}). Escalating to a human.` };
  }

  const highRisk = (policy.escalation.highRiskPlans as readonly string[]).includes(plan);
  if (highRisk) {
    return { escalate: false, reason: "High-risk plan. Proceed cautiously." };
  }

  return { escalate: false, reason: "Within policy. No escalation required." };
}
