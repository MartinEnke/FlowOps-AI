import { prisma } from "../db/prisma";
import { ToolResult } from "./types";
import { Mode } from "../agent/types";

export async function createHandoff(input: {
  customerId: string;
  ticketId?: string;
  reason: string;
  priority: "low" | "med" | "high";
  mode: Mode;
  confidence?: number;
  issues?: string[];
  actions: string[];
}): Promise<ToolResult<{ handoffId: string; status: "pending" }>> {
  if (input.mode !== "live") {
    return { ok: true, data: { handoffId: "shadow_handoff", status: "pending" } };
  }

  try {
    const row = await prisma.handoff.create({
      data: {
        reason: input.reason,
        priority: input.priority,
        status: "pending",
        mode: input.mode,
        confidence: input.confidence ?? null,
        issuesJson: input.issues ? JSON.stringify(input.issues) : null,
        actionsJson: JSON.stringify(input.actions),

        // ✅ relation-safe
        customer: { connect: { id: input.customerId } },

        // ✅ relation-safe (only if present)
        ...(input.ticketId ? { ticket: { connect: { id: input.ticketId } } } : {})
      }
    });

    return { ok: true, data: { handoffId: row.id, status: "pending" } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "handoff create failed" };
  }
}
