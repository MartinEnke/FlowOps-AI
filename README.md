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

## Executive Summary (For Recruiters, Reviewers & VCs)

**FlowOps AI** is a **production-grade agent orchestration platform** that demonstrates how autonomous systems should be built *before* adding large language models.

Rather than focusing on prompt tricks, this project emphasizes:

- Deterministic execution
- Safety guarantees
- Failure isolation
- Auditability
- Human oversight
- Operational resilience

It mirrors how **real SaaS companies deploy AI-powered workflows in production**, where reliability and trust matter more than novelty.

> AI is treated as an *optional assistant*, not a source of authority.

---

## Why This Project Exists

Most "AI agent" demos:
- Call tools directly
- Assume success
- Lack audit trails
- Cannot safely retry
- Fail silently or duplicate side-effects

**FlowOps AI exists to demonstrate the opposite.**

This system executes **real customer-support workflows** while guaranteeing:
- No duplicate side-effects
- Deterministic decisions
- Full observability
- Safe escalation paths

---

## High-Level Architecture

```
Client
  ↓
Fastify API (/chat)
  ↓
FlowOps Agent Orchestrator
  ├─ Policy Engine (deterministic)
  ├─ Verification Layer (anti-hallucination)
  ├─ Tool Layer (account, billing, ticket, email)
  ├─ Idempotency Guard
  ├─ Memory Safety Net
  ├─ Human Handoff Queue
  └─ Outbox Dispatcher
  ↓
SQLite (Prisma 7)
  ├─ Customers
  ├─ Tickets
  ├─ Interactions (audit log)
  ├─ Handoffs (human-in-the-loop)
  └─ Outbox Events (retries & dead-letter)
```

---

## Core Production Concepts

### Shadow vs Live Execution

- **Shadow mode**
  - Executes full logic
  - No persistence
  - Safe for demos and testing

- **Live mode**
  - Persists all side-effects
  - Enforces idempotency
  - Triggers background workers

---

### Policy Engine (Deterministic)

Policies are **code**, not prompts.

They decide:
- Refund eligibility
- Auto-approval thresholds
- Escalation requirements
- Priority assignment

This guarantees predictable behavior regardless of AI output.

---

### Verification Layer (Anti-Hallucination)

Before any side-effect is executed, the agent reply is verified against:

- Account data
- Billing state
- Refund limits
- Tool outputs

Unsafe or inconsistent replies are **blocked automatically** and escalated.

---

### Confidence-Driven Human Escalation

Each interaction produces a confidence score.

Escalation occurs when:
- Confidence drops below threshold
- Verification fails
- Recent escalation history exists

Escalations create structured **handoff records** for human operators.

---

## Human Handoff System

Each handoff includes:

- Customer + ticket context
- Reason and priority
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

## Reliability Engineering (Recent Work)

### Outbox Pattern (Async Side-Effects)

All external side-effects (email, notifications) are written to an **outbox table** and processed asynchronously.

This guarantees:
- No duplicate deliveries
- Retry with backoff
- Dead-letter isolation
- Safe crash recovery

**Email delivery is currently stubbed.**
The outbox still demonstrates **retry and dead-letter behavior** accurately.

> Internal error type may optionally be renamed to `UNHANDLED_EVENT_TYPE` for clarity.

---

### Background Workers

- **Outbox Worker**
  - Processes pending events
  - Retries failures
  - Marks dead-letter events

- **SLA Worker**
  - Tracks handoff SLA deadlines
  - Auto-breaches overdue handoffs
  - Emits escalation notifications via outbox

---

### SLA Timers & Auto-Escalation

Each handoff may include:
- `slaDueAt`
- `slaBreachedAt`

When breached:
- Status is updated
- Notification event is emitted
- Full audit trail preserved

---

### Idempotency & Replay Protection

Each request may include an optional `requestId`.

Guarantees:
- Same `(customerId, requestId)` → same response
- No duplicate tickets
- No duplicate emails
- No duplicate escalations

Enforced via:
- Unique DB constraints
- Interaction replay logic

---

## Audit & Compliance

### Full Audit Export

Audit bundles can be exported as:

- JSON
- CSV

Including:
- Customer
- Tickets
- Interactions
- Handoffs
- Outbox events

This supports:
- Compliance
- Debugging
- Incident reviews

---

## Ops Metrics & Observability

Exposed metrics include:

- Escalation rate
- SLA breach count
- Idempotency replay rate
- Handoff backlog
- Resolution times

Endpoints:
```
GET /metrics
GET /metrics/dashboard
```

---

## Database Models

- Customer
- Ticket
- Interaction (immutable audit log)
- Handoff (workflow state)
- OutboxEvent (reliability layer)

All writes are explicit, traceable, and replay-safe.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- SQLite (bundled)
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

## Example Usage

### Live Request

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust_123","message":"refund please","mode":"live"}'
```

### Idempotent Request

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust_123","message":"refund","mode":"live","requestId":"req_001"}'
```

---

## Debug & Inspection

```
GET /debug/outbox
GET /handoffs/:id
GET /audit/export.json
GET /audit/export.csv
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

## Roadmap

- Webhook delivery safety (external integrations)
- Admin UI (React / Next.js)
- AI-assisted drafting & summarization
- Anomaly detection for escalation hints

---

## Where AI Fits (Intentionally Limited)

AI may assist with:
- Intent extraction
- Drafting responses
- Summarizing handoffs
- Pattern detection

AI will **never**:
- Execute side-effects
- Override policy
- Approve financial actions

Trust remains deterministic.

---

## Author

**Martin Enke**  
Backend / Platform / Agent Engineer

> “AI agents should be trustworthy systems — not just clever outputs.”
