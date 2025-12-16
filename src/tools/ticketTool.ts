import { ToolResult } from "./types";

export async function upsertTicket(input: {
  customerId: string;
  subject: string;
  summary: string;
  priority: "low" | "med" | "high";
  mode: "shadow" | "live";
}): Promise<ToolResult<{
  ticketId: string;
  status: "open" | "pending" | "closed";
}>> {
  if (!input.customerId) return { ok: false, error: "customerId is required" };
  if (!input.subject) return { ok: false, error: "subject is required" };

  // SHADOW MODE: don't “really” persist (we’ll add DB in Step 6)
  if (input.mode === "shadow") {
    return { ok: true, data: { ticketId: "shadow_ticket", status: "open" } };
  }

  // LIVE MODE: still mocked for now
  return { ok: true, data: { ticketId: "tkt_001", status: "open" } };
}
