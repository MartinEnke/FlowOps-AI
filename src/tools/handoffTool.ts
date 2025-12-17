import { prisma } from "../db/prisma";
import { ToolResult } from "./types";
import { Mode } from "../agent/types";
import { Plan } from "../agent/policy";

/**
 * SLA definition (pending-only: must be claimed before this time)
 */
function slaMinutesForPlan(plan: Plan): number {
  switch (plan) {
    case "enterprise":
      return 15;
    case "pro":
      return 60;
    default:
      return 240; // free / unknown
  }
}

export async function createHandoff(input: {
  customerId: string;
  ticketId?: string;
  reason: string;
  priority: "low" | "med" | "high";
  mode: Mode;
  confidence?: number;
  issues?: string[];
  actions: string[];

  // ✅ NEW: required for SLA computation
  plan: Plan;
}): Promise<ToolResult<{ handoffId: string; status: "pending" }>> {
  // --------------------
  // SHADOW MODE
  // --------------------
  if (input.mode !== "live") {
    return {
      ok: true,
      data: { handoffId: "shadow_handoff", status: "pending" }
    };
  }

  try {
    const now = new Date();
    const slaMinutes = slaMinutesForPlan(input.plan);
    const slaDueAt = new Date(now.getTime() + slaMinutes * 60_000);

    const row = await prisma.handoff.create({
      data: {
        reason: input.reason,
        priority: input.priority,
        status: "pending",
        mode: input.mode,
        confidence: input.confidence ?? null,

        issuesJson: input.issues ? JSON.stringify(input.issues) : null,
        actionsJson: JSON.stringify(input.actions),

        // ✅ SLA fields
        slaDueAt,
        slaBreachedAt: null,

        // ✅ relations (safe + explicit)
        customer: { connect: { id: input.customerId } },
        ...(input.ticketId
          ? { ticket: { connect: { id: input.ticketId } } }
          : {})
      }
    });

    return {
      ok: true,
      data: { handoffId: row.id, status: "pending" }
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "handoff create failed"
    };
  }
}
