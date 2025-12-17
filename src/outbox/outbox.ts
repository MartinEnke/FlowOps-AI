// src/outbox/outbox.ts
import { prisma } from "../db/prisma";

export type OutboxStatus = "pending" | "processing" | "sent" | "failed" | "dead";

export async function enqueueOutboxEvent(input: {
  type: string;
  payload: unknown;
  idempotencyKey: string;
}): Promise<{ id: string; status: OutboxStatus }> {
  const { type, payload, idempotencyKey } = input;

  if (!type?.trim()) throw new Error("OutboxEvent.type is required");
  if (!idempotencyKey?.trim()) throw new Error("OutboxEvent.idempotencyKey is required");

  try {
    const row = await prisma.outboxEvent.create({
      data: {
        type,
        payloadJson: JSON.stringify(payload),
        status: "pending",
        attempts: 0,
        nextAttemptAt: new Date(),
        idempotencyKey
      },
      select: { id: true, status: true }
    });

    return { id: row.id, status: row.status as OutboxStatus };
  } catch (e: any) {
    // Unique constraint violation means: already enqueued.
    // Prisma uses P2002 for unique constraint violations.
    if (e?.code === "P2002") {
      const existing = await prisma.outboxEvent.findUnique({
        where: { idempotencyKey },
        select: { id: true, status: true }
      });

      if (!existing) {
        // Extremely unlikely race edge-case
        throw new Error("OutboxEvent already exists but could not be found");
      }

      return { id: existing.id, status: existing.status as OutboxStatus };
    }

    throw e;
  }
}
