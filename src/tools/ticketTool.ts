import { ToolResult } from "./types";
import { prisma } from "../db/prisma";

export async function upsertTicket(input: {
  customerId: string;
  subject: string;
  summary: string;
  priority: "low" | "med" | "high";
  mode: "shadow" | "live";
}): Promise<
  ToolResult<{
    ticketId: string;
    status: "open" | "pending" | "closed";
  }>
> {
  if (!input.customerId) return { ok: false, error: "customerId is required" };
  if (!input.subject) return { ok: false, error: "subject is required" };

  // SHADOW MODE: don't persist
  if (input.mode === "shadow") {
    return { ok: true, data: { ticketId: "shadow_ticket", status: "open" } };
  }

  // LIVE MODE: persist to SQLite via Prisma
  try {
    // ensure customer exists
    await prisma.customer.upsert({
      where: { id: input.customerId },
      update: {},
      create: {
        id: input.customerId,
        email: "unknown@example.com",
        plan: "unknown"
      }
    });

    const ticket = await prisma.ticket.create({
  data: {
    subject: input.subject,
    summary: input.summary,
    priority: input.priority,
    status: "open",
    mode: input.mode,

    // ✅ relation-safe way
    customer: { connect: { id: input.customerId } }
  }
});


    return { ok: true, data: { ticketId: ticket.id, status: "open" } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "ticket create failed" };
  }
}
