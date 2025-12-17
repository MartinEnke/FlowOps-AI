export function toCsv(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escape = (x: any) => {
    const s = x === null || x === undefined ? "" : String(x);
    const needs = /[",\n]/.test(s);
    const safe = s.replace(/"/g, '""');
    return needs ? `"${safe}"` : safe;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(","))
  ];
  return lines.join("\n");
}

export function flattenAuditToRows(bundle: any) {
  const rows: Record<string, any>[] = [];

  for (const i of bundle.interactions ?? []) {
    rows.push({
      kind: "interaction",
      id: i.id,
      customerId: i.customerId,
      ticketId: i.ticketId ?? "",
      createdAt: i.createdAt,
      mode: i.mode,
      confidence: i.confidence,
      verified: i.verified,
      escalated: i.escalated,
      requestId: i.requestId ?? "",
      requestText: i.requestText,
      replyText: i.replyText,
      actions: JSON.stringify(i.actions ?? [])
    });
  }

  for (const h of bundle.handoffs ?? []) {
    rows.push({
      kind: "handoff",
      id: h.id,
      customerId: h.customerId,
      ticketId: h.ticketId ?? "",
      createdAt: h.createdAt,
      status: h.status,
      priority: h.priority,
      reason: h.reason,
      confidence: h.confidence ?? "",
      claimedBy: h.claimedBy ?? "",
      claimedAt: h.claimedAt ?? "",
      resolvedBy: h.resolvedBy ?? "",
      resolvedAt: h.resolvedAt ?? "",
      resolutionNotes: h.resolutionNotes ?? "",
      issues: JSON.stringify(h.issues ?? []),
      actions: JSON.stringify(h.actions ?? [])
    });
  }

  for (const e of bundle.outbox ?? []) {
    rows.push({
      kind: "outbox",
      id: e.id,
      type: e.type,
      status: e.status,
      attempts: e.attempts,
      idempotencyKey: e.idempotencyKey,
      nextAttemptAt: e.nextAttemptAt,
      lastError: e.lastError ?? "",
      createdAt: e.createdAt
    });
  }

  return rows;
}
