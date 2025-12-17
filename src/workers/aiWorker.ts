// src/workers/aiWorker.ts
import { prisma } from "../db/prisma";
import { buildHandoffContextBundle } from "../ai/handoffContext";

export async function handleAiHandoffSummaryGenerate(handoffId: string) {
  // 1) Build context bundle (facts from DB)
  const bundle = await buildHandoffContextBundle(handoffId);

  // 2) Deterministic “AI stub” summary (we swap this later with real LLM)
  const summary = {
    version: "handoff_summary.v1" as const,
    generatedAt: new Date().toISOString(),
    handoffId,
    summaryText:
      `Handoff ${bundle.handoff.id} is ${bundle.handoff.status}. ` +
      `Reason=${bundle.handoff.reason}, Priority=${bundle.handoff.priority}, ` +
      `Confidence=${bundle.handoff.confidence ?? "n/a"}. ` +
      `Customer=${bundle.customer.id} (plan=${bundle.customer.plan}).`
  };

  // 3) Persist idempotently (unique: handoffId + type)
  await prisma.aiArtifact.upsert({
    where: { handoffId_type: { handoffId, type: "handoff_summary.v1" } },
    update: {
      status: "ok",
      inputJson: JSON.stringify(bundle),
      outputJson: JSON.stringify(summary)
    },
    create: {
      handoffId,
      type: "handoff_summary.v1",
      status: "ok",
      inputJson: JSON.stringify(bundle),
      outputJson: JSON.stringify(summary)
    }
  });

  console.log(`🤖 [AI] wrote handoff_summary.v1 for handoffId=${handoffId}`);
}
