// src/tools/emailTool.ts
import { ToolResult } from "./types";
import { enqueueOutboxEvent } from "../outbox/outbox";

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
  mode: "shadow" | "live";

  // ✅ needed for idempotent enqueue keys
  customerId: string;
  requestId: string;
}): Promise<ToolResult<{ messageId: string }>> {
  if (!input.to?.trim()) return { ok: false, error: "to is required" };
  if (!input.subject?.trim()) return { ok: false, error: "subject is required" };
  if (!input.customerId?.trim()) return { ok: false, error: "customerId is required" };
  if (!input.requestId?.trim()) return { ok: false, error: "requestId is required" };

  if (input.mode === "shadow") {
    return { ok: true, data: { messageId: "shadow_email" } };
  }

  // LIVE MODE: enqueue email delivery via outbox (SendGrid/Postmark/SES later)
  try {
    const idempotencyKey = `email:${input.customerId}:${input.requestId}`;

    const outbox = await enqueueOutboxEvent({
      type: "email.send",
      idempotencyKey,
      payload: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        // extra metadata for traceability
        customerId: input.customerId,
        requestId: input.requestId,
        createdAt: new Date().toISOString()
      }
    });

    return { ok: true, data: { messageId: `queued:${outbox.id}` } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed to enqueue email" };
  }
}
