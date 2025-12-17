# FlowOps AI

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Fastify](https://img.shields.io/badge/Fastify-Production--Ready-black)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
![Architecture](https://img.shields.io/badge/Architecture-Agentic%20Systems-success)
![Status](https://img.shields.io/badge/Status-Production--Grade-brightgreen)

**A Production-Grade Customer Engagement Agent Platform**  
_TypeScript · Agentic Workflows · Policy · Verification · Human-in-the-Loop · Reliability Engineering_

---

## Executive Summary

**FlowOps AI** is a **production-grade agent orchestration platform** that demonstrates how autonomous systems should be built *before* large language models are introduced.

Rather than focusing on prompt engineering, the system emphasizes:

- Deterministic execution
- Safety guarantees
- Failure isolation
- Auditability
- Human oversight
- Operational resilience

AI is **assistive — never authoritative**.

---

## Why This Project Exists

Most AI agent demos:
- Execute tools directly
- Assume success paths
- Lack audit trails
- Cannot safely retry
- Risk duplicate side-effects

**FlowOps AI exists to demonstrate the opposite.**

It mirrors how **real SaaS platforms deploy AI-assisted workflows in production**, where trust, reliability, and control matter more than novelty.

---

## Key Capabilities

- Deterministic policy engine
- Verification layer (anti-hallucination)
- Human-in-the-loop escalation
- SLA timers & auto-breach detection
- Outbox pattern with retries & dead-letter
- Idempotency & replay protection
- Immutable audit trails
- Versioned AI artifacts
- Ops metrics & observability

---

## High-Level Architecture

```
Client
  ↓
Fastify API (/chat)
  ↓
FlowOps Agent Orchestrator
  ├─ Policy Engine (deterministic)
  ├─ Verification Layer
  ├─ Tool Layer
  ├─ Idempotency Guard
  ├─ Human Handoff Queue
  └─ Outbox Dispatcher
  ↓
SQLite (Prisma)
```

---

## Core Production Concepts

### Shadow vs Live Execution

- **Shadow mode**
  - Executes full logic
  - No persistence
  - Safe for testing and demos

- **Live mode**
  - Persists all side-effects
  - Enforces idempotency
  - Triggers background workers

---

### Policy Engine (Deterministic)

Policies are **code**, not prompts.

They decide:
- Refund eligibility
- Escalation thresholds
- Priority assignment
- Auto-approval limits

This guarantees predictable behavior regardless of AI output.

---

### Verification Layer (Anti-Hallucination)

Before any side-effect:
- Account data is checked
- Billing state is validated
- Tool outputs are verified

Unsafe or inconsistent responses are **blocked and escalated automatically**.

---

## Human Handoff System

Each handoff includes:
- Customer & ticket context
- Reason & priority
- Confidence score
- Actions already taken
- Verification issues
- SLA timers

Humans can:
- Claim
- Resolve
- Annotate
- Audit decisions

---

## Reliability Engineering

### Outbox Pattern

All side-effects (emails, notifications, AI jobs) are written to an **outbox table** and processed asynchronously.

Guarantees:
- No duplicate deliveries
- Retry with backoff
- Dead-letter isolation
- Crash-safe recovery

Email delivery is intentionally **stubbed**.  
The outbox still demonstrates retry and dead-letter behavior accurately.

Unknown events may be labeled as `UNHANDLED_EVENT_TYPE`.

---

### Background Workers

- **Outbox Worker**
  - Processes pending events
  - Retries failures
  - Marks dead-letter events

- **SLA Worker**
  - Tracks handoff deadlines
  - Auto-breaches overdue handoffs
  - Emits escalation notifications

---

### SLA Timers & Auto-Escalation

Each handoff may include:
- `slaDueAt`
- `slaBreachedAt`

When breached:
- Status updates automatically
- Escalation event is emitted
- Full audit trail is preserved

---

### Idempotency & Replay Protection

Optional `requestId` guarantees:
- Same request → same response
- No duplicate tickets
- No duplicate emails
- No duplicate escalations

Enforced via:
- DB constraints
- Interaction replay logic

---

## AI Integration (Current State)

### AI Handoff Summary (v1)

When a handoff is created, an async event  
`ai.handoff_summary.generate` is enqueued.

The AI worker:
1. Builds a strict context bundle
2. Generates a deterministic summary
3. Persists it as a versioned AI artifact
4. Never blocks the core workflow

AI output is **always optional and reviewable**.

---

## Where AI Fits (Intentionally Limited)

AI may assist with:
- Intent extraction
- Handoff summarization
- Drafting suggested replies
- Pattern detection

AI will **never**:
- Execute side-effects
- Override policy
- Approve financial actions

Trust remains deterministic.

---

## Correct Next Steps (In Order)

1. Replace summary stub with LLM-backed generation
2. AI-assisted response drafting (human approval required)
3. AI risk scoring (never authoritative)
4. Admin UI for operators (React / Next.js)

---

## Ops & Observability

Metrics:
- Escalation rate
- SLA breaches
- Idempotency replays
- Handoff backlog
- Resolution times

Endpoints:
```
GET /metrics
GET /metrics/dashboard
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- SQLite
- Prisma CLI

### Installation

```bash
git clone https://github.com/your-username/flowops-ai.git
cd flowops-ai
npm install
```

### Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### Run Services

```bash
npm run dev
npm run dev:outbox-worker
npm run dev:sla-worker
```

---

## Current State

✔ Agent orchestration  
✔ Policy enforcement  
✔ Verification layer  
✔ Human-in-the-loop  
✔ Outbox & retries  
✔ SLA enforcement  
✔ Audit export  
✔ Ops metrics  

This is a **platform**, not a demo.

---

## Author

**Martin Enke**

> AI agents should be trustworthy systems — not just clever outputs.
