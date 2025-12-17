import { prisma } from "../db/prisma";

export async function buildAuditBundle(input: { customerId?: string; ticketId?: string }) {

  const { customerId, ticketId } = input;

  if (!customerId && !ticketId) {
    throw new Error("Provide customerId or ticketId");
  }

  // Resolve customerId from ticketId if needed
  let resolvedCustomerId = customerId;
  if (!resolvedCustomerId && ticketId) {
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { customerId: true } });
    if (!t) throw new Error("Ticket not found");
    resolvedCustomerId = t.customerId;
  }

  const customer = await prisma.customer.findUnique({ where: { id: resolvedCustomerId! } });

  const tickets = await prisma.ticket.findMany({
    where: {
      customerId: resolvedCustomerId!,
      ...(ticketId ? { id: ticketId } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  const interactions = await prisma.interaction.findMany({
    where: {
      customerId: resolvedCustomerId!,
      ...(ticketId ? { ticketId } : {})
    },
    orderBy: { createdAt: "asc" }
  });

  const handoffs = await prisma.handoff.findMany({
    where: {
      customerId: resolvedCustomerId!,
      ...(ticketId ? { ticketId } : {})
    },
    orderBy: { createdAt: "asc" }
  });

  const outbox = await prisma.outboxEvent.findMany({
    where: {
      // very simple linkage: idempotencyKey contains customer id (matches your pattern)
      ...(resolvedCustomerId ? { idempotencyKey: { contains: `email:${resolvedCustomerId}:` } } : {})
    },
    orderBy: { createdAt: "asc" }
  });

  return {
    generatedAt: new Date().toISOString(),
    scope: { customerId: resolvedCustomerId, ticketId: ticketId ?? null },
    customer,
    tickets,
    interactions: interactions.map((i) => ({
      ...i,
      actions: safeJson(i.actionsJson),
    })),
    handoffs: handoffs.map((h) => ({
      ...h,
      issues: safeJson(h.issuesJson),
      actions: safeJson(h.actionsJson),
    })),
    outbox
  };
}

function safeJson(v: string | null | undefined) {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return []; }
}


