# FlowOps AI

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Fastify](https://img.shields.io/badge/Fastify-Production--Ready-black)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
![Architecture](https://img.shields.io/badge/Architecture-Agentic%20Systems-success)
![Status](https://img.shields.io/badge/Status-Production--Grade-brightgreen)

**A Production-Grade Customer Engagement Agent**  
_TypeScript · Agents · Policy · Verification · Human-in-the-Loop_

---

## Executive Summary (For Recruiters & Reviewers)

**FlowOps AI** is a **production-grade, policy-driven AI agent system** that demonstrates how modern SaaS companies safely deploy autonomous agents **with guardrails, verification, auditability, and human oversight**.

Unlike prompt-only demos, this system executes **real business workflows** while enforcing deterministic rules, preventing unsafe actions, and escalating to humans when needed.

> This project is designed to showcase **backend engineering maturity**, **agent orchestration**, and **real-world production patterns**.

---

## Why This Project Exists

Most “AI agent” demos stop at tool-calling.

**FlowOps AI goes further:**

- Executes full workflows (account → billing → ticket → email)
- Applies deterministic **policy engines** (refunds, escalation)
- Verifies agent outputs before execution (anti-hallucination)
- Supports **shadow vs live** execution
- Persists full **audit trails**
- Escalates to humans based on confidence & verification
- Prevents duplicate side-effects via **idempotency**
- Exposes **ops metrics** for observability

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

## Core Production Concepts

### Shadow vs Live Mode
- **Shadow**: Executes logic without persistence (safe demos & testing)
- **Live**: Persists customers, tickets, interactions, and handoffs

### Policy Engine
Deterministic rules decide:
- Refund eligibility
- Auto-approval vs human review
- Escalation thresholds

### Verification Layer
Every agent reply is validated against:
- Tool outputs (account + billing)
- Refund limits
- Claimed actions  
Unsafe replies are **blocked and escalated**.

### Confidence-Driven Escalation
Low confidence or verification failure triggers **human handoff**.

### Human Handoff Queue
Escalations create structured handoff records including:
- Reason, priority, status
- Confidence score
- Verification issues
- Actions executed
- Ticket & customer context

### Idempotency + Replay Protection
- Optional `requestId` per request
- Same `(customerId, requestId)` returns cached response
- Prevents duplicate tickets, emails, and escalations
- Enforced via unique DB constraints

---

## Ops Metrics & Observability

Production metrics exposed via API + dashboard:

- Handoff counts (pending / claimed / resolved)
- Average resolution time
- Escalation rate
- Idempotency replay rate
- Confidence drift (recent vs historical)

Endpoints:
```
GET /metrics
GET /metrics/dashboard
```

---

## Database Models

- Customer
- Ticket
- Interaction (audit trail + idempotency)
- Handoff (human escalation queue)

Each **live interaction** persists:
- requestText, replyText
- confidence, verified, escalated
- actionsJson
- requestId
- ticketId

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- SQLite (bundled)
- Prisma CLI

### Installation

```bash
git clone https://github.com/your-username/flowops-ai.git
cd flowops-ai
npm install
```

### Setup Database

```bash
npx prisma generate
npx prisma migrate dev
```

### Run the Server

```bash
npm run dev
```

Server starts on:
```
http://localhost:3000
```

---

## Example Usage

### Live Request

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust_123","message":"refund please","mode":"live"}'
```

### Idempotent Request (Recommended)

```bash
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

## Current State

✔ Full agent loop  
✔ Policy & verification layers  
✔ Shadow vs live execution  
✔ Human handoff workflows  
✔ Idempotency & replay protection  
✔ Ops metrics dashboard  
✔ Recruiter / production-ready architecture  

---

## Roadmap

- SLA timers & auto-escalation
- Audit export (JSON / CSV)
- Webhook delivery safety (outbox + retry)
- Optional React / Next.js admin console

---

## Where AI Fits 

AI is **assistive, not authoritative**:
- Intent extraction
- Drafting responses
- Summarizing handoffs
- Detecting anomalies for escalation

All actions remain governed by **policy + verification**.

---

## Author

**Martin Enke**  
_AI / Backend / Agent Engineer_

> “AI agents should be trusted systems — not just clever outputs.”
