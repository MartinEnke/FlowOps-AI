import { ToolResult } from "./types";

export async function sendEmail(input: {
  to: string;
  subject: string;
  body: string;
  mode: "shadow" | "live";
}): Promise<ToolResult<{ messageId: string }>> {
  if (!input.to) return { ok: false, error: "to is required" };
  if (!input.subject) return { ok: false, error: "subject is required" };

  if (input.mode === "shadow") {
    return { ok: true, data: { messageId: "shadow_email" } };
  }

  // LIVE MODE: still mocked for now (SendGrid later)
  return { ok: true, data: { messageId: "msg_001" } };
}
