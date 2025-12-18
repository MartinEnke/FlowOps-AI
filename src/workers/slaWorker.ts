import "dotenv/config";
import { prisma } from "../db/prisma";
import { enqueueOutboxEvent } from "../outbox/outbox";


const POLL_MS = 10_000;

async function runOnce() {
  const now = new Date();

  // find pending handoffs that are past due and not yet breached
  const due = await prisma.handoff.findMany({
    where: {
      status: "pending",
      slaDueAt: { lte: now },
      slaBreachedAt: null
    },
    orderBy: { slaDueAt: "asc" },
    take: 25,
    select: {
      id: true,
      customerId: true,
      ticketId: true,
      priority: true,
      slaDueAt: true
    }
  });

  for (const h of due) {
    // mark breached atomically (only if still pending and unbreached)
    const updated = await prisma.handoff.updateMany({
      where: {
        id: h.id,
        status: "pending",
        slaBreachedAt: null
      },
      data: {
        slaBreachedAt: new Date(),
        priority: h.priority === "high" ? "high" : "high" // bump to high
      }
    });

    if (updated.count === 0) continue;

    // enqueue notification (idempotent)
    const idempotencyKey = `sla:${h.id}`;
    await enqueueOutboxEvent({
      type: "notify.sla_breach",
      idempotencyKey,
      payload: {
        handoffId: h.id,
        customerId: h.customerId,
        ticketId: h.ticketId,
        slaDueAt: h.slaDueAt?.toISOString(),
        breachedAt: new Date().toISOString(),
        message: "Handoff SLA breached (pending not claimed in time)."
      }
    });

    console.log(`⏰ [SLA] breached handoff=${h.id} -> priority=high, notify queued`);
  }
}

async function main() {
  console.log("⏰ SLA worker started (pending-only)");
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      console.error("[SLA] worker error:", e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error("SLA worker crashed:", e);
  process.exit(1);
});
