// src/tools/handoffTool.ts
import { prisma } from "../db/prisma";
import { ToolResult } from "./types";
import { Mode } from "../agent/types";
import { Plan } from "../agent/policy";
import { OUTBOX_EVENT_TYPES } from "../outbox/eventTypes";

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

  // ✅ required for SLA computation
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

    const idempotencyKey = `ai:handoff_summary:${row.id}`;

    // 🤖 Enqueue AI handoff summary generation (async, idempotent)
    // We use upsert to guarantee exactly-one outbox job per handoff summary request.
    await prisma.outboxEvent.upsert({
      where: { idempotencyKey },
      update: {
        // Intentionally empty to avoid mutating an already-queued job.
      },
      create: {
        type: OUTBOX_EVENT_TYPES.AI_HANDOFF_SUMMARY_GENERATE,
        payloadJson: JSON.stringify({
          handoffId: row.id,
          version: "handoff_context.v1"
        }),
        idempotencyKey
      }
    });

    console.log(
      `🤖 [HANDOFF] queued AI summary via outbox (handoffId=${row.id}, key=${idempotencyKey})`
    );

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
