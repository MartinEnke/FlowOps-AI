// src/ai/handoffContext.ts
import { prisma } from "../db/prisma";

export type HandoffContextBundleV1 = {
  version: "handoff_context.v1";
  generatedAt: string;

  handoff: {
    id: string;
    reason: string;
    priority: string;
    status: string;
    confidence: number | null;
    slaDueAt: string | null;
    slaBreachedAt: string | null;
  };

  customer: {
    id: string;
    plan: string;
  };

  ticket: {
    id: string;
    subject: string;
    priority: string;
    status: string;
  } | null;

  interactions: Array<{
    id: string;
    createdAt: string;
    requestText: string;
    replyText: string;
    confidence: number;
    escalated: boolean;
    verified: boolean;
    actions: string[];
  }>;

  policyOutcome: {
    refundApproved: boolean | null;
    refundAmount: number | null;
  };

  verification: {
    issues: string[];
  };

  executedActions: string[];
};


export async function buildHandoffContextBundle(
  handoffId: string
) {
  const handoff = await prisma.handoff.findUnique({
    where: { id: handoffId },
    include: {
      customer: true,
      ticket: true,
    }
  });

  if (!handoff) {
    throw new Error(`Handoff not found: ${handoffId}`);
  }

  const interactions = await prisma.interaction.findMany({
    where: {
      customerId: handoff.customerId,
      ...(handoff.ticketId ? { ticketId: handoff.ticketId } : {})
    },
    orderBy: { createdAt: "asc" },
    take: 10 // safety cap
  });

  const parsedActions = safeJson(handoff.actionsJson);

  // Extract policy facts from actions (deterministic!)
  const refundAction = parsedActions.find(a =>
    a.startsWith("refund_")
  );

  const policyOutcome = refundAction?.startsWith("refund_auto_approved")
    ? { refundApproved: true, refundAmount: null }
    : { refundApproved: null, refundAmount: null };

  return {
    version: "handoff_context.v1" as const,
    generatedAt: new Date().toISOString(),

    handoff: {
      id: handoff.id,
      reason: handoff.reason,
      priority: handoff.priority,
      status: handoff.status,
      confidence: handoff.confidence,
      slaDueAt: handoff.slaDueAt?.toISOString() ?? null,
      slaBreachedAt: handoff.slaBreachedAt?.toISOString() ?? null
    },

    customer: {
      id: handoff.customer.id,
      plan: handoff.customer.plan
    },

    ticket: handoff.ticket
      ? {
          id: handoff.ticket.id,
          subject: handoff.ticket.subject,
          priority: handoff.ticket.priority,
          status: handoff.ticket.status
        }
      : null,

    interactions: interactions.map(i => ({
      id: i.id,
      createdAt: i.createdAt.toISOString(),
      requestText: i.requestText,
      replyText: i.replyText,
      confidence: i.confidence,
      escalated: i.escalated,
      verified: i.verified,
      actions: safeJson(i.actionsJson)
    })),

    policyOutcome,

    verification: {
      issues: safeJson(handoff.issuesJson)
    },

    executedActions: parsedActions
  };
}

function safeJson(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    return JSON.parse(v);
  } catch {
    return [];
  }
}
