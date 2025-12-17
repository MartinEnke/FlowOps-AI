// src/agent/flowAgent.ts

import { getAccountStatus } from "../tools/accountTool";
import { getBillingSummary } from "../tools/billingTool";
import { upsertTicket } from "../tools/ticketTool";
import { sendEmail } from "../tools/emailTool";
import { createHandoff } from "../tools/handoffTool";
import { decideRefund, shouldEscalate, Plan } from "./policy";
import { ChatRequest, ChatResponse, Mode } from "./types";
import { verifyReply, type VerificationInput } from "./verifier";
import { prisma } from "../db/prisma";
import crypto from "crypto";

function normalizeMessage(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function computeFallbackRequestId(params: { customerId: string; message: string; mode: Mode }) {
  const base = `${params.customerId}|${normalizeMessage(params.message)}|${params.mode}`;
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 24);
}

function estimateConfidence(params: { toolOk: boolean; message: string }): number {
  const { toolOk, message } = params;
  const looksClear = message.length >= 10;
  if (!toolOk) return 0.4;
  if (!looksClear) return 0.6;
  return 0.85;
}

function summarizeIntent(message: string) {
  const msg = message.toLowerCase();
  return {
    apiIssue: msg.includes("api") || msg.includes("key"),
    billingIssue: msg.includes("bill") || msg.includes("invoice") || msg.includes("refund"),
    asksRefund: msg.includes("refund")
  };
}

async function getRecentInteractions(customerId: string, limit = 5) {
  return prisma.interaction.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      requestText: true,
      replyText: true,
      escalated: true,
      verified: true,
      confidence: true,
      createdAt: true
    }
  });
}

export async function runFlowOpsAgent(input: ChatRequest): Promise<ChatResponse> {
  const mode: Mode = input.mode ?? "shadow";
  const actions: string[] = [];

  // Helper: only persists in LIVE mode
  async function logInteractionLive(params: {
    customerId: string;
    requestId: string;
    ticketId?: string;
    requestText: string;
    replyText: string;
    mode: Mode;
    confidence: number;
    escalated: boolean;
    verified: boolean;
    actions: string[];
    email: string;
    plan: string;
  }) {
    if (params.mode !== "live") return;

    await prisma.customer.upsert({
      where: { id: params.customerId },
      update: { email: params.email, plan: params.plan },
      create: { id: params.customerId, email: params.email, plan: params.plan }
    });

    // 7.3: interaction write is idempotent via @@unique([customerId, requestId])
    try {
      await prisma.interaction.create({
        data: {
          customerId: params.customerId,
          channel: "chat",
          requestText: params.requestText,
          replyText: params.replyText,
          mode: params.mode,
          confidence: params.confidence,
          escalated: params.escalated,
          verified: params.verified,
          actionsJson: JSON.stringify(params.actions),
          requestId: params.requestId,
          ticketId: params.ticketId ?? null
        }
      });
    } catch (e: any) {
      // If the same requestId is logged twice (race), ignore the duplicate.
      // Prisma uses P2002 for unique constraint violation.
      if (e?.code !== "P2002") throw e;
    }
  }

  // 0) Validate input
  if (!input.customerId?.trim()) {
    return {
      reply: "Please provide a valid customerId so I can look up your account.",
      mode,
      escalated: true,
      confidence: 0.3,
      actions
    };
  }

  // 7.3: Idempotency key (prefer client-provided requestId)
  const requestId =
    input.requestId?.trim() ||
    computeFallbackRequestId({ customerId: input.customerId, message: input.message, mode });

  // 7.3: Replay protection (LIVE only) — return the previously saved response
  if (mode === "live") {
    const existing = await prisma.interaction.findFirst({
  where: {
    customerId: input.customerId,
    requestId
  },
  select: {
    replyText: true,
    escalated: true,
    verified: true,
    confidence: true,
    actionsJson: true,
    ticketId: true
  }
});

    if (existing) {
  actions.push("idempotency_replay");

  return {
    reply: existing.replyText,
    mode,
    escalated: existing.escalated,
    confidence: existing.confidence,
    actions: [...JSON.parse(existing.actionsJson), ...actions],
    ...(existing.ticketId ? { ticketId: existing.ticketId } : {})
  };
}
  }

  // 7.2 (Option A): Load recent memory (LIVE only)
  const recentInteractions =
    mode === "live" ? await getRecentInteractions(input.customerId, 5) : [];
  const hasRecentHistory = recentInteractions.length > 0;
  const hadRecentEscalation = recentInteractions.some((i) => i.escalated);

  // 1) Fetch account + billing
  const accountRes = await getAccountStatus({ customerId: input.customerId });
  const billingRes = await getBillingSummary({ customerId: input.customerId });

  const toolOk = accountRes.ok && billingRes.ok;
  const confidence = estimateConfidence({ toolOk, message: input.message });

  if (!toolOk) {
    const reason = !accountRes.ok
      ? accountRes.error
      : !billingRes.ok
        ? billingRes.error
        : "Unknown tool error";

    actions.push("tool_fetch_failed");

    return {
      reply: `I couldn’t retrieve the necessary account/billing details (${reason}). I’m escalating this to a human agent.`,
      mode,
      escalated: true,
      confidence,
      actions
    };
  }

  const account = accountRes.data;
  const billing = billingRes.data;

  const intent = summarizeIntent(input.message);
  const plan = account.plan as Plan;

  // 2) Create a ticket early (so we always have a reference)
  const subject = intent.billingIssue
    ? "Billing issue"
    : intent.apiIssue
      ? "API access issue"
      : "General support request";

  // 7.2: Add recent history into ticket summary for context
  const historyBlock = hasRecentHistory
    ? [
        ``,
        `Recent history (latest first):`,
        ...recentInteractions.map((i, idx) => {
          const when = i.createdAt.toISOString();
          const req = i.requestText.replace(/\s+/g, " ").slice(0, 120);
          return `#${idx + 1} [${when}] escalated=${i.escalated} conf=${i.confidence} req="${req}"`;
        })
      ].join("\n")
    : "";

  const summary = [
    `Customer message: ${input.message}`,
    `Plan: ${account.plan}, API key: ${account.apiKeyStatus}`,
    `Last invoice: ${billing.lastInvoiceId} (${billing.invoiceStatus}, amount ${billing.lastInvoiceAmount})`,
    historyBlock
  ]
    .filter(Boolean)
    .join("\n");

  const ticketRes = await upsertTicket({
    customerId: input.customerId,
    subject,
    summary,
    priority: "med",
    mode
  });

  if (!ticketRes.ok) {
    actions.push("ticket_create_failed");

    const finalReply =
      `I found your account details but couldn't create a ticket (${ticketRes.error}). ` +
      `I’m escalating this to a human agent.`;

    return {
      reply: finalReply,
      mode,
      escalated: true,
      confidence: Math.min(confidence, 0.6),
      actions
    };
  }

  actions.push(`ticket_created:${ticketRes.data.ticketId}`);

  // 3) Refund logic (only if asked) + track what we *claim* for verification
  let refundLine = "";
  let refundClaim: { approved: boolean; amount: number; needsHuman: boolean } | undefined;

  if (intent.asksRefund) {
    const refundDecision = decideRefund({
      plan,
      refundableAmount: billing.refundableAmount
    });

    if (!refundDecision.allow) {
      refundLine = `Refund request: not eligible. Reason: ${refundDecision.reason}`;
      refundClaim = { approved: false, amount: 0, needsHuman: false };
      actions.push("refund_denied");
    } else if (refundDecision.needsHuman) {
      refundLine = `Refund request: eligible up to €${refundDecision.maxAmount}, but requires human approval. (${refundDecision.reason})`;
      refundClaim = { approved: true, amount: refundDecision.maxAmount, needsHuman: true };
      actions.push("refund_needs_human");
    } else {
      refundLine = `Refund request: approved for €${refundDecision.maxAmount}. (${refundDecision.reason})`;
      refundClaim = { approved: true, amount: refundDecision.maxAmount, needsHuman: false };
      actions.push("refund_auto_approved");
    }
  }

  // 4) Compose reply draft (this is what we verify)
  const continuityLine = hadRecentEscalation
    ? `I see this is a follow-up to a recent escalated case — I’ll be extra careful and keep the context.`
    : "";

  const replyDraft = [
    `✅ I opened ticket **${ticketRes.data.ticketId}** for you.`,
    `Plan: **${account.plan}** · API key: **${account.apiKeyStatus}** · Last invoice: **${billing.lastInvoiceId}** (${billing.invoiceStatus})`,
    refundLine ? `\n${refundLine}` : "",
    `\nI’ll continue helping you here — and I sent a follow-up email to **${account.email}**.`,
    continuityLine ? `\n\n${continuityLine}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  // 5) Verify the reply draft against tool outputs
  const verificationInput: VerificationInput = {
    replyDraft,
    account: {
      plan,
      apiKeyStatus: account.apiKeyStatus,
      email: account.email
    },
    billing: {
      lastInvoiceId: billing.lastInvoiceId,
      invoiceStatus: billing.invoiceStatus,
      refundableAmount: billing.refundableAmount
    },
    ...(refundClaim ? { claimedRefund: refundClaim } : {})
  };

  const verification = verifyReply(verificationInput);
  const verificationPassed = verification.passed;

  if (!verificationPassed) {
    actions.push("verification_failed");
    actions.push(...verification.issues.map((i) => `verify_issue:${i}`));
  } else {
    actions.push("verification_passed");
  }

  // 6) Escalation decision is based on confidence + verification
  const escalationDecision = shouldEscalate({
    plan,
    confidence,
    verificationPassed
  });

  // 7.2 (Option A): memory-based safety net
  const memoryForcesEscalation = hadRecentEscalation;

  if (memoryForcesEscalation) {
    escalationDecision.escalate = true;
    actions.push("memory_recent_escalation_escalate");
  }

  // Keep a single consistent confidence value whenever we escalate.
  const finalConfidence = escalationDecision.escalate ? Math.min(confidence, 0.6) : confidence;

  if (escalationDecision.escalate) {
    actions.push("escalate_to_human");

    const handoffReason =
      !verificationPassed
        ? "verification_failed"
        : memoryForcesEscalation
          ? "recent_escalation"
          : confidence < 0.7
            ? "low_confidence"
            : "policy_requires_human";

    // Follow-ups after an escalation should not be "low" priority.
    const handoffPriority: "low" | "med" | "high" =
      plan === "enterprise"
        ? "high"
        : memoryForcesEscalation
          ? "med"
          : confidence < 0.7
            ? "med"
            : "low";

    const handoffRes = await createHandoff({
      customerId: input.customerId,
      ticketId: ticketRes.data.ticketId,
      reason: handoffReason,
      priority: handoffPriority,
      mode,
      confidence: finalConfidence,
      ...(verificationPassed ? {} : { issues: verification.issues }),
      actions
    });

    if (handoffRes.ok) actions.push(`handoff_created:${handoffRes.data.handoffId}`);
    else actions.push(`handoff_failed:${handoffRes.error}`);
  }

  // 7) Email follow-up (shadow returns shadow_email; live still mocked for now)
  const emailSubject = `FlowOps Support Ticket ${ticketRes.data.ticketId}: Update`;

  const emailBody = [
    `Hi there,`,
    ``,
    `Thanks for reaching out. I checked your account and opened ticket ${ticketRes.data.ticketId}.`,
    `Plan: ${account.plan}`,
    `API key status: ${account.apiKeyStatus}`,
    `Last invoice: ${billing.lastInvoiceId} (${billing.invoiceStatus})`,
    refundLine ? `` : ``,
    refundLine ? refundLine : ``,
    ``,
    escalationDecision.escalate
      ? `Because this case needs extra attention, I’m escalating it to a human specialist.`
      : `I’ll keep you updated here as we proceed.`,
    ``,
    `— FlowOps AI`
  ]
    .filter(Boolean)
    .join("\n");

  const emailRes = await sendEmail({
  to: account.email,
  subject: emailSubject,
  body: emailBody,
  mode,
  customerId: input.customerId,
  requestId
});

  if (emailRes.ok) actions.push(`email_queued:${emailRes.data.messageId}`);
else actions.push(`email_failed:${emailRes.error}`);

  // 8) Final reply + DB log (LIVE only)
  if (escalationDecision.escalate) {
    const finalReply =
      `I opened ticket **${ticketRes.data.ticketId}** and pulled your account/billing details.\n\n` +
      `To be safe, I’m escalating this to a human agent to double-check everything before confirming next steps.`;

    await logInteractionLive({
      customerId: input.customerId,
      requestId,
      ticketId: ticketRes.data.ticketId,
      requestText: input.message,
      replyText: finalReply,
      mode,
      confidence: finalConfidence,
      escalated: true,
      verified: verificationPassed,
      actions,
      email: account.email,
      plan: account.plan
    });

    return {
      reply: finalReply,
      mode,
      ticketId: ticketRes.data.ticketId,
      escalated: true,
      confidence: finalConfidence,
      actions
    };
  }

  await logInteractionLive({
    customerId: input.customerId,
    requestId,
    ticketId: ticketRes.data.ticketId,
    requestText: input.message,
    replyText: replyDraft,
    mode,
    confidence: finalConfidence,
    escalated: false,
    verified: verificationPassed,
    actions,
    email: account.email,
    plan: account.plan
  });

  return {
    reply: replyDraft,
    mode,
    ticketId: ticketRes.data.ticketId,
    escalated: false,
    confidence: finalConfidence,
    actions
  };
}
