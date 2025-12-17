# FlowOps AI

**A Production-Grade Customer Engagement Agent**  
_TypeScript · Agents · Policy · Verification · Human-in-the-Loop_

---

## Overview

**FlowOps AI** is a real-world, end-to-end **agentic customer support system** designed to simulate how modern SaaS companies automate support workflows **without sacrificing safety, traceability, or human oversight**.

This project focuses on **agent orchestration and production patterns**, not just prompt-based AI responses.

---

## Why This Project Exists

Most “AI agent” demos stop at tool-calling.

**FlowOps AI goes further:**

- Executes full business workflows (account → billing → ticket → email)
- Applies deterministic policy logic (refund + escalation rules)
- Verifies agent outputs before acting (anti-hallucination guardrails)
- Supports **shadow vs live execution**
- Persists full **audit trails**
- Escalates to humans when confidence drops or verification fails
- Prevents duplicate side-effects via **idempotency + replay protection**
- Exposes **ops metrics** for monitoring and iteration

This mirrors how AI agents are deployed in **real production environments**.

---

## High-Level Architecture

```
Client
  ↓
Fastify API (/chat)
  ↓
FlowOps Agent (runFlowOpsAgent)
  ├─ Account Tool
  ├─ Billing Tool
  ├─ Ticket Tool
  ├─ Email Tool
  ├─ Policy Engine
  ├─ Verification Layer
  ├─ Memory Safety Net
  ├─ Idempotency Guard
  └─ Human Handoff Queue
  ↓
SQLite (Prisma 7)
```

---

## Core Concepts

### 1) Shadow vs Live Mode

- **Shadow**: Executes logic without persistence (safe testing / demos)
- **Live**: Persists customers, tickets, interactions, and handoffs

---

### 2) Policy Engine

Deterministic business rules decide:

- Refund eligibility
- Auto-approval vs human review
- Escalation thresholds

---

### 3) Verification Layer

Every agent reply is validated against:

- Tool outputs (account + billing)
- Refund limits
- Claimed actions

Unsafe replies are **blocked and escalated**.

---

### 4) Confidence-Driven Escalation

Low confidence or verification failure triggers a **human handoff**.

---

### 5) Human Handoff Queue (Step 7.1 ✅)

Escalations create a **Handoff** record containing:

- Reason, priority, status
- Confidence score
- Verification issues (if any)
- Actions executed so far
- Linked ticket + customer context

---

### 6) Conversation Memory Safety Net (Step 7.2 ✅)

In **LIVE mode**, the agent loads the last **N interactions**:

- Adds context into ticket summaries
- Applies conservative behavior if the customer recently escalated

---

### 7) Idempotency + Replay Protection (Step 7.3 ✅)

`/chat` accepts an optional `requestId`:

- Same `(customerId, requestId)` returns the **previous response**
- Prevents duplicate tickets, emails, and handoffs
- Enforced via a **unique database constraint**

---

### 8) Human Claiming & Resolution Workflow (Step 7.4 ✅)

Handoffs support real human workflows:

- Atomic claiming (concurrency-safe)
- Ownership enforcement
- Resolution notes
- Optional ticket auto-closure

**Endpoints**

```
POST /handoffs/:id/claim
POST /handoffs/:id/resolve
GET  /handoffs/:id
```

---

### 9) Ops Metrics Dashboard (Step 7.8 ✅)

Production-grade metrics exposed via API and HTML dashboard.

**Tracked metrics**

- Handoff counts (pending / claimed / resolved)
- Average resolution time
- Escalation rate
- Idempotency replay rate
- Confidence drift (recent vs historical)

**Endpoints**

```
GET /metrics
GET /metrics/dashboard
```

---

## Database Models (Prisma + SQLite)

- Customer
- Ticket
- Interaction (audit trail + idempotency)
- Handoff (human escalation queue)

Each **live interaction** persists:

- `requestText`, `replyText`
- `confidence`, `verified`, `escalated`
- `actionsJson`
- `requestId` (idempotency)
- `ticketId` (traceability)

---

## Tech Stack

- TypeScript
- Fastify
- Prisma 7
- SQLite
- Agent-style orchestration
- Policy-first design
- Verification-first safety
- Human-in-the-loop escalation
- Idempotency / replay protection
- Operational metrics

---

## Example Live Interaction

### Basic request

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust_123","message":"refund please","mode":"live"}'
```

### Idempotent request (recommended)

```bash
REQ="req_001"

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust_123","message":"refund","mode":"live","requestId":"req_001"}'
```

Retrying with the same `requestId` returns the same response and avoids duplicates.

---

## Debug & Inspection Endpoints

```
GET /debug/handoffs
GET /handoffs/:id
GET /debug/interactions/:customerId
GET /debug/account/:customerId
GET /debug/policy/refund/:plan/:amount
GET /metrics
GET /metrics/dashboard
```

---

## Current State (Completed)

- ✔ Full agent loop
- ✔ Live persistence
- ✔ Verification layer
- ✔ Policy-based decisions
- ✔ Shadow vs live separation
- ✔ 7.1 Human handoff queue
- ✔ 7.2 Conversation memory safety net
- ✔ 7.3 Idempotency + replay protection
- ✔ 7.4 Handoff claiming + resolution workflow
- ✔ 7.8 Ops metrics + dashboard
- ✔ Recruiter-ready architecture

---

## Roadmap (Optional Enhancements)

### High-Value Production Upgrades

- **7.5** SLA timers + auto-escalation
- **7.7** Audit export (JSON / CSV / compliance)

### Reliability Patterns

- **7.6** Webhook delivery safety  
  (outbox + retry + dead-letter queue)

---

## Frontend (Deferred)

Prisma Studio + `/metrics/dashboard` provide sufficient visibility today.  
A React / Next.js console can be added later if needed.

---

## Where AI Can Plug In (Future Work)

AI is intentionally **assistive, not authoritative**:

- Intent & entity extraction
- Human handoff summaries
- Response drafting (facts enforced by verifier)
- Anomaly detection → escalation

---

## Author

**Martin Enke**  
_AI / Backend / Agent Systems Engineer_

> “AI agents should be trusted systems — not just clever outputs.”
