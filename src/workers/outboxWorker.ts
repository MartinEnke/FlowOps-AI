// src/workers/outboxWorker.ts
import "dotenv/config";
import { prisma } from "../db/prisma";
import { OUTBOX_EVENT_TYPES } from "../outbox/eventTypes";
import { handleAiHandoffSummaryGenerate } from "./aiWorker";
import { handleAiReplyDraftGenerate } from "./replyDraftWorker";


console.log("🔑 OPENAI key loaded?", {
  hasKey: Boolean(process.env.OPENAI_API_KEY),
  prefix: process.env.OPENAI_API_KEY?.slice(0, 10) ?? null,
  model: process.env.OPENAI_MODEL ?? null
});


type OutboxStatus = "pending" | "processing" | "sent" | "failed" | "dead";

const POLL_MS = 1000;
const MAX_ATTEMPTS = 8;

function backoffMs(attempts: number) {
  // exponential-ish backoff with cap: 1s, 2s, 4s, 8s, ... up to 60s
  return Math.min(60_000, 1000 * Math.pow(2, Math.max(0, attempts)));
}

async function deliver(event: { type: string; payloadJson: string }) {
  switch (event.type) {
    case OUTBOX_EVENT_TYPES.SLA_BREACH_NOTIFY: {
      const payload = JSON.parse(event.payloadJson);
      console.log("🚨 [OUTBOX] SLA breach notification", payload);
      return;
    }

    case OUTBOX_EVENT_TYPES.EMAIL_SEND: {
      const payload = JSON.parse(event.payloadJson);
      console.log(
        `📧 [OUTBOX] email stub to=${payload.to} subject="${payload.subject}"`
      );
      return;
    }

    case OUTBOX_EVENT_TYPES.AI_HANDOFF_SUMMARY_GENERATE: {
      const payload = JSON.parse(event.payloadJson) as { handoffId: string };
      await handleAiHandoffSummaryGenerate(payload.handoffId);
      return;
    }

    case OUTBOX_EVENT_TYPES.AI_REPLY_DRAFT_GENERATE: {
  const payload = JSON.parse(event.payloadJson) as { handoffId: string };
  await handleAiReplyDraftGenerate(payload.handoffId);
  return;
}

    default:
      throw new Error(`UNHANDLED_EVENT_TYPE:${event.type}`);
  }
}

async function claimNextEvent() {
  const now = new Date();

  // Pick one eligible event
  const next = await prisma.outboxEvent.findFirst({
    where: {
      status: { in: ["pending", "failed"] },
      nextAttemptAt: { lte: now }
    },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  if (!next) return null;

  // Attempt to claim it atomically (best-effort in SQLite)
  const claimed = await prisma.outboxEvent.updateMany({
    where: { id: next.id, status: { in: ["pending", "failed"] } },
    data: { status: "processing" }
  });

  if (claimed.count === 0) return null;

  return prisma.outboxEvent.findUnique({
    where: { id: next.id },
    select: {
      id: true,
      type: true,
      payloadJson: true,
      attempts: true
    }
  });
}

async function runOnce() {
  const ev = await claimNextEvent();
  if (!ev) return;

  try {
    await deliver({ type: ev.type, payloadJson: ev.payloadJson });

    await prisma.outboxEvent.update({
      where: { id: ev.id },
      data: {
        status: "sent",
        lastError: null
      }
    });

    console.log(`✅ [OUTBOX] sent id=${ev.id} type=${ev.type}`);
  } catch (err: any) {
    const attempts = ev.attempts + 1;
    const isDead = attempts >= MAX_ATTEMPTS;

    await prisma.outboxEvent.update({
      where: { id: ev.id },
      data: {
        status: (isDead ? "dead" : "failed") as OutboxStatus,
        attempts,
        lastError: String(err?.message ?? err),
        nextAttemptAt: isDead
          ? new Date()
          : new Date(Date.now() + backoffMs(attempts))
      }
    });

    console.log(
      `${isDead ? "💀" : "⚠️"} [OUTBOX] failed id=${ev.id} attempts=${attempts} err=${String(
        err?.message ?? err
      )}`
    );
  }
}

async function main() {
  console.log("🔁 Outbox worker started");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runOnce();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error("Outbox worker crashed:", e);
  process.exit(1);
});
