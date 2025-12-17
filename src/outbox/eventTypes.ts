// src/outbox/eventTypes.ts

export const OUTBOX_EVENT_TYPES = {
  EMAIL_SEND: "email.send",
  SLA_BREACH_NOTIFY: "notify.sla_breach",

  // 🤖 AI (assistive, async)
  AI_HANDOFF_SUMMARY_GENERATE: "ai.handoff_summary.generate",
} as const;

export type OutboxEventType =
  typeof OUTBOX_EVENT_TYPES[keyof typeof OUTBOX_EVENT_TYPES];
