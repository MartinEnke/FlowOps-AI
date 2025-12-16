import { ToolResult } from "./types";
import { prisma } from "../db/prisma";

export async function upsertTicket(input: {
  customerId: string;
  subject: string;
  summary: string;
  priority: "low" | "med" | "high";
  mode: "shadow" | "live";
}): Promise<ToolResult<{ ticketId: string; status: "open" | "pending" | "closed" }>> {
  if (!input.customerId) return { ok: false, error: "customerId is required" };
  if (!input.subject) return { ok: false, error: "subject is required" };

  // SHADOW MODE: no DB writes
  if (input.mode === "shadow") {
    return { ok: true, data: { ticketId: "shadow_ticket", status: "open" } };
  }

  try {
    // Ensure customer exists (agent will later keep email/plan updated)
    await prisma.customer.upsert({
      where: { id: input.customerId },
      update: {},
      create: {
        id: input.customerId,
        email: "unknown@example.com",
        plan: "unknown"
      }
    });

    // For MVP: always create a new ticket (we can add real "upsert" later)
    const ticketId = `tkt_${Date.now()}`;

    await prisma.ticket.create({
      data: {
        id: ticketId,
        customerId: input.customerId,
        subject: input.subject,
        summary: input.summary,
        priority: input.priority,
        status: "open",
        mode: input.mode
      }
    });

    return { ok: true, data: { ticketId, status: "open" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create ticket" };
  }
}
