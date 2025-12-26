// src/workers/aiWorker.ts
import { prisma } from "../db/prisma";
import { buildHandoffContextBundle } from "../ai/handoffContext";
import { generateStructuredJson } from "../ai/openaiClient";

// ---- Prompts & Schemas ----
import {
  HANDOFF_SUMMARY_SCHEMA,
  buildHandoffSummaryPrompt
} from "../ai/prompts/handoffSummary";

import {
  REPLY_DRAFT_SCHEMA,
  buildReplyDraftPrompt
} from "../ai/prompts/replyDraft";

import {
  RISK_ASSESSMENT_SCHEMA,
  buildRiskAssessmentPrompt
} from "../ai/prompts/riskAssessment";

import {
  RESOLUTION_SUGGESTION_SCHEMA,
  buildResolutionSuggestionPrompt
} from "../ai/contracts/resolutionSuggestion";




// -----------------------------
// Shared helper (keeps things DRY)
// -----------------------------
async function persistArtifact(params: {
  handoffId: string;
  type: string;
  status: "ok" | "failed";
  input: any;
  output: any;
}) {
  const { handoffId, type, status, input, output } = params;

  await prisma.aiArtifact.upsert({
    where: { handoffId_type: { handoffId, type } },
    update: {
      status,
      inputJson: JSON.stringify(input),
      outputJson: JSON.stringify(output)
    },
    create: {
      handoffId,
      type,
      status,
      inputJson: JSON.stringify(input),
      outputJson: JSON.stringify(output)
    }
  });
}

// -----------------------------
// 1) HANDOFF SUMMARY
// -----------------------------
export async function handleAiHandoffSummaryGenerate(handoffId: string) {
  const bundle = await buildHandoffContextBundle(handoffId);

  try {
    const { system, user } = buildHandoffSummaryPrompt(bundle);

    const llmJson = await generateStructuredJson({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      system,
      user,
      schemaName: "handoff_summary_v1",
      schema: HANDOFF_SUMMARY_SCHEMA,
      timeoutMs: 20_000
    });

    const artifact = {
      ...llmJson,
      version: "handoff_summary.v1" as const,
      handoffId,
      generatedAt: new Date().toISOString()
    };

    await persistArtifact({
      handoffId,
      type: "handoff_summary.v1",
      status: "ok",
      input: bundle,
      output: artifact
    });

    console.log(`🤖 [AI] wrote handoff_summary.v1 for handoffId=${handoffId}`);
  } catch (err: any) {
    await persistArtifact({
      handoffId,
      type: "handoff_summary.v1",
      status: "failed",
      input: bundle,
      output: {
        version: "handoff_summary.v1",
        generatedAt: new Date().toISOString(),
        handoffId,
        error: String(err?.message ?? err)
      }
    });

    throw err;
  }
}

// -----------------------------
// 2) REPLY DRAFT (HUMAN APPROVAL)
// -----------------------------
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

    const artifact = {
      ...llmJson,
      version: "reply_draft.v1" as const,
      handoffId,
      generatedAt: new Date().toISOString()
    };

    await persistArtifact({
      handoffId,
      type: "reply_draft.v1",
      status: "ok",
      input: bundle,
      output: artifact
    });

    console.log(`✍️ [AI] wrote reply_draft.v1 for handoffId=${handoffId}`);
  } catch (err: any) {
    await persistArtifact({
      handoffId,
      type: "reply_draft.v1",
      status: "failed",
      input: bundle,
      output: {
        version: "reply_draft.v1",
        generatedAt: new Date().toISOString(),
        handoffId,
        error: String(err?.message ?? err)
      }
    });

    throw err;
  }
}

// -----------------------------
// 3) RISK ASSESSMENT (NON-AUTHORITATIVE)
// -----------------------------
export async function handleAiRiskAssessmentGenerate(handoffId: string) {
  const bundle = await buildHandoffContextBundle(handoffId);

  try {
    const { system, user } = buildRiskAssessmentPrompt(bundle);

    const llmJson = await generateStructuredJson({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      system,
      user,
      schemaName: "risk_assessment_v1",
      schema: RISK_ASSESSMENT_SCHEMA,
      timeoutMs: 20_000
    });

    const artifact = {
      ...llmJson,
      version: "risk_assessment.v1" as const,
      handoffId,
      generatedAt: new Date().toISOString()
    };

    await persistArtifact({
      handoffId,
      type: "risk_assessment.v1",
      status: "ok",
      input: bundle,
      output: artifact
    });

    console.log(`⚠️ [AI] wrote risk_assessment.v1 for handoffId=${handoffId}`);
  } catch (err: any) {
    await persistArtifact({
      handoffId,
      type: "risk_assessment.v1",
      status: "failed",
      input: bundle,
      output: {
        version: "risk_assessment.v1",
        generatedAt: new Date().toISOString(),
        handoffId,
        error: String(err?.message ?? err)
      }
    });

    throw err;
  }
}

// -----------------------------
// 4) RESOLUTION SUGGESTION (HUMAN APPROVAL)
// -----------------------------
export async function handleAiResolutionSuggestionGenerate(handoffId: string) {
  const bundle = await buildHandoffContextBundle(handoffId);

  try {
    const { system, user } = buildResolutionSuggestionPrompt(bundle);

    const llmJson = await generateStructuredJson({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      system,
      user,
      schemaName: "resolution_suggestion_v1",
      schema: RESOLUTION_SUGGESTION_SCHEMA,
      timeoutMs: 20_000
    });

    const artifact = {
      ...llmJson,
      version: "resolution_suggestion.v1" as const,
      handoffId,
      generatedAt: new Date().toISOString()
    };

    await persistArtifact({
      handoffId,
      type: "resolution_suggestion.v1",
      status: "ok",
      input: bundle,
      output: artifact
    });

    console.log(`🧭 [AI] wrote resolution_suggestion.v1 for handoffId=${handoffId}`);
  } catch (err: any) {
    await persistArtifact({
      handoffId,
      type: "resolution_suggestion.v1",
      status: "failed",
      input: bundle,
      output: {
        version: "resolution_suggestion.v1",
        generatedAt: new Date().toISOString(),
        handoffId,
        error: String(err?.message ?? err)
      }
    });

    throw err;
  }
}
