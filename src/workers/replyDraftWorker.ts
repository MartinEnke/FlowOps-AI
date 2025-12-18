import { prisma } from "../db/prisma";
import { buildHandoffContextBundle } from "../ai/handoffContext";
import { generateStructuredJson } from "../ai/openaiClient";
import { REPLY_DRAFT_SCHEMA, buildReplyDraftPrompt } from "../ai/prompts/replyDraft";

export async function handleAiReplyDraftGenerate(handoffId: string) {
  const bundle = await buildHandoffContextBundle(handoffId);

  try {
    const { system, user } = buildReplyDraftPrompt(bundle);

    const llmJson = await generateStructuredJson({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      system,
      user,
      schemaName: "reply_draft_v1",
      schema: REPLY_DRAFT_SCHEMA,
      timeoutMs: 20_000
    });

    const draft = {
      ...llmJson,
      version: "reply_draft.v1" as const,
      handoffId,
      generatedAt: new Date().toISOString()
    };

    await prisma.aiArtifact.upsert({
      where: { handoffId_type: { handoffId, type: "reply_draft.v1" } },
      update: {
        status: "ok",
        inputJson: JSON.stringify(bundle),
        outputJson: JSON.stringify(draft)
      },
      create: {
        handoffId,
        type: "reply_draft.v1",
        status: "ok",
        inputJson: JSON.stringify(bundle),
        outputJson: JSON.stringify(draft)
      }
    });

    console.log(`✍️ [AI] wrote reply_draft.v1 for handoffId=${handoffId}`);
  } catch (err: any) {
    await prisma.aiArtifact.upsert({
      where: { handoffId_type: { handoffId, type: "reply_draft.v1" } },
      update: {
        status: "failed",
        inputJson: JSON.stringify(bundle),
        outputJson: JSON.stringify({
          version: "reply_draft.v1",
          generatedAt: new Date().toISOString(),
          handoffId,
          error: String(err?.message ?? err)
        })
      },
      create: {
        handoffId,
        type: "reply_draft.v1",
        status: "failed",
        inputJson: JSON.stringify(bundle),
        outputJson: JSON.stringify({
          version: "reply_draft.v1",
          generatedAt: new Date().toISOString(),
          handoffId,
          error: String(err?.message ?? err)
        })
      }
    });

    throw err;
  }
}
