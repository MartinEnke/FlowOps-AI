import { getAccountStatus } from "../tools/accountTool";
import { getBillingSummary } from "../tools/billingTool";
import { upsertTicket } from "../tools/ticketTool";
import { sendEmail } from "../tools/emailTool";
import { decideRefund, shouldEscalate, Plan } from "./policy";
import { ChatRequest, ChatResponse, Mode } from "./types";

function estimateConfidence(params: {
  toolOk: boolean;
  message: string;
}): number {
  // Simple stub for now. We'll replace with LLM-based or classifier later.
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
    asksRefund: msg.includes("refund"),
  };
}

export async function runFlowOpsAgent(input: ChatRequest): Promise<ChatResponse> {
  const mode: Mode = input.mode ?? "shadow";
  const actions: string[] = [];

  if (!input.customerId?.trim()) {
    return {
      reply: "Please provide a valid customerId so I can look up your account.",
      mode,
      escalated: true,
      confidence: 0.3,
      actions
    };
  }

  // 1) Fetch account + billing
  const accountRes = await getAccountStatus({ customerId: input.customerId });
  const billingRes = await getBillingSummary({ customerId: input.customerId });

  const toolOk = accountRes.ok && billingRes.ok;
  const confidence = estimateConfidence({ toolOk, message: input.message });

  // If tools fail, escalate
  if (!toolOk) {
    const reason = !accountRes.ok ? accountRes.error : !billingRes.ok ? billingRes.error : "Unknown tool error";
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

  // 2) Policy decisions
  const plan = account.plan as Plan;

  // For now: verification is always "passed" because we aren't using an LLM yet.
  const verificationPassed = true;

  const escalationDecision = shouldEscalate({
    plan,
    confidence,
    verificationPassed
  });

  if (escalationDecision.escalate) {
    actions.push("escalate_to_human");
  }

  // 3) Create a ticket (in shadow it returns shadow_ticket)
  const subject = intent.billingIssue
    ? "Billing issue"
    : intent.apiIssue
      ? "API access issue"
      : "General support request";

  const summary = [
    `Customer message: ${input.message}`,
    `Plan: ${account.plan}, API key: ${account.apiKeyStatus}`,
    `Last invoice: ${billing.lastInvoiceId} (${billing.invoiceStatus}, amount ${billing.lastInvoiceAmount})`
  ].join("\n");

  const priority = escalationDecision.escalate ? "high" : "med";

  const ticketRes = await upsertTicket({
    customerId: input.customerId,
    subject,
    summary,
    priority,
    mode
  });

  if (!ticketRes.ok) {
    return {
      reply: `I found your account details but couldn't create a ticket (${ticketRes.error}). Please try again or I can escalate to a human agent.`,
      mode,
      escalated: true,
      confidence: Math.min(confidence, 0.6),
      actions
    };
  }

  actions.push(`ticket_created:${ticketRes.data.ticketId}`);

  // 4) Refund logic (only if asked)
  let refundLine = "";
  if (intent.asksRefund) {
    const refundDecision = decideRefund({
      plan,
      refundableAmount: billing.refundableAmount
    });

    if (!refundDecision.allow) {
      refundLine = `Refund request: not eligible. Reason: ${refundDecision.reason}`;
      actions.push("refund_denied");
    } else if (refundDecision.needsHuman) {
      refundLine = `Refund request: eligible up to €${refundDecision.maxAmount}, but requires human approval. (${refundDecision.reason})`;
      actions.push("refund_needs_human");
    } else {
      refundLine = `Refund request: approved for €${refundDecision.maxAmount}. (${refundDecision.reason})`;
      actions.push("refund_auto_approved");
    }
  }

  // 5) Email follow-up (shadow = no real send, just returns shadow_email)
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
  ].filter(Boolean).join("\n");

  const emailRes = await sendEmail({
    to: account.email,
    subject: emailSubject,
    body: emailBody,
    mode
  });

  if (emailRes.ok) actions.push(`email_sent:${emailRes.data.messageId}`);
  else actions.push(`email_failed:${emailRes.error}`);

  // 6) Compose reply for chat
  const replyLines = [
    `✅ I opened ticket **${ticketRes.data.ticketId}** for you.`,
    `Plan: **${account.plan}** · API key: **${account.apiKeyStatus}** · Last invoice: **${billing.lastInvoiceId}** (${billing.invoiceStatus})`,
    refundLine ? `\n${refundLine}` : "",
    escalationDecision.escalate
      ? `\nI’m escalating this to a human agent to make sure it’s handled safely.`
      : `\nI’ll continue helping you here — and I sent a follow-up email to **${account.email}**.`
  ].filter(Boolean).join("\n");

  return {
    reply: replyLines,
    mode,
    ticketId: ticketRes.data.ticketId,
    escalated: escalationDecision.escalate,
    confidence,
    actions
  };
}
