// src/workers/aiWorker.ts
import { prisma } from "../db/prisma";
import { buildHandoffContextBundle } from "../ai/handoffContext";

export async function handleAiHandoffSummaryGenerate(payloadJson: string) {
  const payload = JSON.parse(payloadJson) as {
    handoffId: string;
    version?: string;
  };

  const handoffId = payload.handoffId;
  if (!handoffId) throw new Error("Missing handoffId in payload");

  // 1) Build deterministic context bundle (versioned contract)
  const context = await buildHandoffContextBundle(handoffId);

  // 2) STUB summary (no model yet) — deterministic, safe
  const summaryV1 = {
    summary:
      `Handoff ${context.handoff.id} (${context.handoff.reason}) is pending. ` +
      `Priority=${context.handoff.priority}. ` +
      `Confidence=${context.handoff.confidence ?? "n/a"}. ` +
      (context.handoff.slaBreachedAt ? "SLA breached." : "SLA not breached."),
    keyFacts: [
      `Customer plan: ${context.customer.plan}`,
      context.ticket ? `Ticket: ${context.ticket.id} (${context.ticket.subject})` : "No ticket linked",
      `Interactions included: ${context.interactions.length}`
    ],
    risks: [
      ...(context.handoff.slaBreachedAt ? ["SLA breach occurred; prioritize response."] : []),
      ...(context.verification.issues.length ? ["Verification issues exist; double-check before action."] : [])
    ],
    recommendedNextSteps: [
      "Open the linked ticket and review full summary/history",
      "Confirm whether refund action was executed or only approved by policy",
      "Respond to the customer with the next steps and timeline"
    ]
  };

  // 3) Persist as an artifact (human-facing, no side effects)
  await prisma.aiArtifact.upsert({
    where: {
      // requires @@unique([handoffId, type]) in schema OR use a unique idempotencyKey field
      // If you don't have that yet, swap this to `create` for now.
      handoffId_type: { handoffId, type: "handoff_summary.v1" }
    },
    update: {
      status: "ok",
      inputJson: JSON.stringify(context),
      outputJson: JSON.stringify(summaryV1)
    },
    create: {
      handoffId,
      type: "handoff_summary.v1",
      status: "ok",
      inputJson: JSON.stringify(context),
      outputJson: JSON.stringify(summaryV1)
    }
  });
}
