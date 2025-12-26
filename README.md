# AI-Assisted Operations Console (FlowOps AI)

Structured, **production-grade AI assistance** for high-stakes operational workflows.

---

## What this is (short version)

FlowOps AI is **not** a chatbot demo and **not** an autonomous agent.

It is a **human-in-the-loop operations platform** that shows how AI should be integrated into real systems:
- safely
- deterministically
- auditable
- and without removing human accountability

AI generates *assistive artifacts* (summaries, drafts, risk signals).  
Humans **own**, **approve**, and **resolve** every case.

---

## Why this project exists

Most “AI agent” demos:
- directly execute tools
- skip verification
- lack idempotency
- have no audit trail
- break under retries
- cannot explain failures

**FlowOps AI demonstrates the opposite.**

It models how serious SaaS, fintech, trust & safety, and enterprise systems integrate LLMs *without* surrendering control.

> AI assists decisions.  
> Humans remain responsible.

---

## Core Concepts

### 1. Human Handoffs

A **handoff** represents a case that:
- exceeded confidence thresholds
- hit a policy boundary
- escalated
- or approached an SLA breach

Handoffs **must** be reviewed by a human operator.

Each handoff has:
- status (pending → claimed → resolved)
- priority
- SLA deadline
- audit trail
- optional AI artifacts

---

### 2. AI Artifacts (Assistive Only)

AI never changes state directly.

Instead, it produces **versioned artifacts**:

| Artifact | Purpose |
|--------|--------|
| Handoff Summary | Reduce operator cognitive load |
| Risk Assessment | Highlight uncertainty & urgency |
| Reply Draft | Speed up communication (human approval required) |

Artifacts are:
- JSON-schema validated
- versioned
- persisted
- reviewable
- exportable

---

### 3. Deterministic Policy Engine

Policies are **code**, not prompts.

They decide:
- refund eligibility
- escalation rules
- priority
- auto-approval limits

AI **cannot override policy**.

---

### 4. Verification Layer (Anti-Hallucination)

Before any side-effect:
- account data is verified
- billing state is checked
- tool outputs are validated

Inconsistencies trigger **handoffs**, not silent failures.

---

### 5. Outbox Pattern (Reliability)

All async work goes through an **outbox table**:
- AI jobs
- emails
- notifications
- SLA alerts

Guarantees:
- idempotency
- retries with backoff
- crash safety
- dead-letter isolation

---

### 6. SLA Enforcement

Each handoff may define:
- `slaDueAt`
- `slaBreachedAt`

A background worker:
- monitors deadlines
- auto-marks breaches
- emits escalation events
- preserves auditability

---

## AI Capabilities (Current)

### AI Handoff Summary (v1)

Triggered automatically when a handoff is created.

Produces:
- situation overview
- key facts
- risks & watch-outs
- recommended next step

Purpose: **fast human context loading**

---

### AI Reply Draft (v1)

Triggered manually by operator:

```http
POST /handoffs/:id/ai/draft
```

Produces:
- customer-facing reply suggestion
- grounded strictly in context
- never auto-sent

Rules enforced:
- no invented facts
- uncertainty must be explicit
- human approval required

---

### AI Risk Assessment (v1)

Triggered manually by operator:

```http
POST /handoffs/:id/ai/risk
```

Produces:
- risk level (low / medium / high)
- plain-language reasoning
- attention flags

Risk scores:
- do NOT block actions
- do NOT trigger side-effects
- only guide prioritization

---

## What AI Will *Never* Do

AI will **never**:
- approve refunds
- send emails
- close cases
- override policy
- bypass verification
- mutate system state

---

## Backend Architecture

```
Fastify API
  ├─ Auth & RBAC
  ├─ Policy Engine
  ├─ Verification Layer
  ├─ Handoff Management
  ├─ Outbox Dispatcher
  └─ Metrics & Audit
        ↓
     SQLite (Prisma)
        ↓
 Outbox Worker(s)
```

---

## Frontend (flowops-admin)

The admin UI is a **Next.js internal console** for operators.

Capabilities:
- filter & sort cases
- inspect AI artifacts
- claim ownership
- resolve cases
- view SLA status
- audit decisions

Buttons behave intentionally:

| Action | Behavior |
|------|---------|
| Draft Reply | Triggers async AI job |
| Run Risk Check | Triggers async AI job |
| Assign to Me | Claims handoff (409 if invalid) |
| Mark Resolved | Resolves handoff (409 if already resolved) |

409 responses are **expected safety guards**, not errors.

---

## Metrics & Observability

Available endpoints:
```
GET /metrics
GET /metrics/dashboard
```

Tracked signals:
- SLA breaches
- handoff backlog
- resolution time
- AI artifact generation
- retry counts
- dead-letter events

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- SQLite
- Prisma

### Install
```bash
npm install
```

### Database
```bash
npx prisma generate
npx prisma migrate dev
```

### Run backend
```bash
npm run dev
npm run dev:outbox-worker
npm run dev:sla-worker
```

### Run frontend
```bash
cd flowops-admin
npm run dev
```

---

## Project Status

✔ Deterministic policy engine  
✔ Verification layer  
✔ Human handoff system  
✔ SLA enforcement  
✔ Outbox pattern  
✔ AI summaries  
✔ AI reply drafts  
✔ AI risk assessment  
✔ Admin UI  
✔ Audit & export  
✔ Metrics  

This is **infrastructure-grade AI**, not a demo.

---

## Author

**Martin Enke**

> AI systems should be accountable systems — not clever shortcuts.
