# FlowOps AI 
**A Production-Grade Customer Engagement Agent (TypeScript + Agents + Policy + Verification)**

FlowOps AI is a real-world, end-to-end **agentic customer support system** designed to simulate how modern SaaS companies automate support workflows while maintaining safety, traceability, and human oversight.

This project demonstrates **agent orchestration**, **policy enforcement**, **verification**, **human-in-the-loop escalation**, and **production safety patterns** (memory + idempotency), rather than just prompt-based AI responses.

---

## Why This Project Exists

Most “AI agent” demos stop at tool-calling.

**FlowOps AI goes further:**
- Executes full business workflows (account → billing → ticket → email)
- Applies deterministic policy logic (refund + escalation rules)
- Verifies agent outputs before acting (anti-hallucination guardrails)
- Supports shadow vs live execution
- Persists real audit trails
- Escalates to humans when confidence drops or verification fails
- Prevents duplicate side-effects with idempotency / replay protection

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
  ├─ Memory Safety Net (recent interactions)
  └─ Escalation + Handoff Queue
  ↓
SQLite (Prisma 7)
```

---

## Core Concepts

### 1) Shadow vs Live Mode
- **Shadow**: Executes logic without persistence (safe testing / demos)
- **Live**: Persists customers, tickets, interactions, and handoffs

### 2) Policy Engine
Deterministic business rules decide:
- Refund eligibility
- Auto-approval vs human review
- Escalation thresholds

### 3) Verification Layer
Every agent reply is validated against:
- Tool outputs (account + billing)
- Billing limits / refundable amounts
- Claimed actions (e.g., approved refund amount)

Unsafe replies are **blocked and escalated**.

### 4) Confidence + Verification Escalation
Low confidence or verification failure triggers a human handoff.

### 5) Human Handoff Queue (Step 7.1 ✅)
Escalations create a **Handoff** row in the database:
- reason, priority, status
- confidence
- verification issues (if any)
- actions executed so far
- linked ticket + customer context

### 6) Conversation Memory Safety Net (Step 7.2 ✅)
In **LIVE** mode, the agent loads the **last N interactions**:
- Adds context into the ticket summary
- Uses a conservative safety net: if the customer recently escalated, follow-ups escalate more readily

### 7) Idempotency + Replay Protection (Step 7.3 ✅)
In **LIVE** mode, `/chat` accepts an optional `requestId`:
- Same `(customerId, requestId)` returns the previously saved response
- Prevents duplicate tickets, handoffs, and emails
- Implemented with a unique constraint on `Interaction(customerId, requestId)`

---

## Database Models (Prisma + SQLite)

- **Customer**
- **Ticket**
- **Interaction** (audit trail + idempotency keys)
- **Handoff** (human queue)

Each live interaction is persisted with:
- `requestText`, `replyText`
- `confidence`, `escalated`, `verified`
- `actionsJson` (what the agent actually did)
- `requestId` (idempotency)
- `ticketId` (traceability)

---

## 🛠️ Tech Stack

- **TypeScript**
- **Fastify**
- **Prisma 7**
- **SQLite**
- **Agent-style orchestration**
- **Policy-first design**
- **Verification-first safety**
- **Human-in-the-loop escalation**
- **Idempotency / replay protection**

---

## 🔍 Example Live Interaction

### Basic request
```bash
curl -X POST http://localhost:3000/chat   -H "Content-Type: application/json"   -d '{"customerId":"cust_123","message":"refund please","mode":"live"}'
```

### Idempotent request (recommended)
```bash
REQ="req_001"

curl -X POST http://localhost:3000/chat   -H "Content-Type: application/json"   -d "{"customerId":"cust_123","message":"refund","mode":"live","requestId":"$REQ"}"
```

Retrying with the same `requestId` returns the same response and avoids duplicates.

---

## 🧪 Debug Endpoints

- `GET /debug/handoffs` ✅ (view pending handoffs)
- `GET /debug/interactions/:customerId`
- `GET /debug/account/:customerId`
- `GET /debug/policy/refund/:plan/:amount`

These endpoints expose internal state for transparency and testing.

---

## ✅ Current State (Completed)

✔ Full agent loop  
✔ Live persistence  
✔ Verification layer  
✔ Policy-based decisions  
✔ Shadow vs live separation  
✔ **7.1 Human handoff queue + /debug/handoffs**  
✔ **7.2 Conversation memory safety net**  
✔ **7.3 Idempotency + replay protection**  
✔ Recruiter-ready architecture  

---

## Next Steps (Roadmap)

### Highest value (strongest hire-signal)
- **7.4 Handoff claiming + resolution**  
  Add human workflow: claim/resolve handoffs, ownership, and concurrency safety.
- **7.8 Metrics dashboard**  
  Track escalation rate, replay rate, confidence drift, SLA performance.

### Very valuable (production maturity)
- **7.5 SLA timers + auto-escalation**  
  Cron/worker scans pending handoffs and escalates after thresholds.
- **7.7 Audit trail + compliance export**  
  Export interactions + handoffs per customer (JSON/CSV/PDF).

### Valuable but more niche (heavier reliability pattern)
- **7.6 Webhook delivery safety**  
  Outbox table + retries + dead-letter queue pattern for external delivery.

**Recommended next step:** do **7.4 first**, then **7.8**.

---

## Frontend Idea (Future Work)

A small React/Next.js “Support Console” makes this feel like a real SaaS:
- Chat panel (customerId, message, mode, requestId)
- Handoff queue view (filter, claim, resolve)
- Metrics dashboard (escalations, replays, confidence drift)

---

## Where AI Can Plug In (Future Work)

Right now the agent is mostly deterministic orchestration with guardrails. AI becomes valuable when it stays **assistive** and the system keeps **policy + verification** in control:

- **Intent + entity extraction** (invoice id, urgency, issue type) instead of keyword matching
- **Handoff summaries** for humans during escalation (fast, practical value)
- **Reply drafting** (LLM writes wording only; verifier enforces facts)
- **Anomaly flags** (suspicious claims) → triggers escalation, not automatic decisions

---

## 👤 Author

Built by **Martin Enke**  
AI / Backend / Agent Systems Engineer

This project is intentionally designed to reflect **real-world agent deployment patterns**, not toy demos.

> *“AI agents should be trusted systems — not just clever outputs.”*
