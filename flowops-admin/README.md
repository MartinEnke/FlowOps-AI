# AI‑Assisted Operations Console (Admin UI)

The **AI‑Assisted Operations Console** is the internal operator interface for the **FlowOps AI Platform**.

It provides a **human‑in‑the‑loop operations UI** for reviewing escalated cases (“handoffs”), inspecting AI‑generated artifacts, and performing **explicit, accountable operator actions**.

This UI is intentionally designed as a **decision‑support system**, not an autonomous agent interface or chatbot frontend.

---

## Purpose & Scope

The admin console exists to give operators and supervisors:

- Full visibility into active and historical handoffs
- Transparent access to all AI‑generated artifacts
- Explicit control over claiming, escalation, and resolution
- A safe interface to *request* AI assistance without delegating authority

AI outputs are **assistive and review‑only by default**.  
Nothing is applied automatically without a human decision.

---

## Core Concepts

### Handoffs

A **handoff** represents a customer case that has entered a higher‑risk or escalation path.

Each handoff includes:

- Status (`pending`, `claimed`, `resolved`)
- Priority
- Escalation reason
- SLA deadline & breach state
- Links to tickets, customers, and audit trails

The UI treats handoffs as **operational units**, not chat threads.

---

### AI Artifacts

The backend may attach **versioned AI artifacts** to a handoff.  
These artifacts are:

- Generated asynchronously
- Persisted in the database
- Read‑only in the UI
- Fully auditable
- Never auto‑applied

Common artifact types include:

- `handoff_summary.v1`  
  A concise, structured briefing to orient operators quickly.

- `risk_assessment.v1`  
  A non‑authoritative risk signal highlighting attention flags, SLA pressure, or escalation patterns.

- `reply_draft.v1`  
  A customer‑facing response suggestion intended for review, editing, or rejection.

Artifacts are shown **exactly as produced**, with timestamps and raw JSON available for inspection.

---

## Current Capabilities

### Handoff Overview

The main overview page allows operators to:

- View all handoffs (active & historical)
- Filter by:
  - Status
  - Priority
  - Risk level (AI‑assisted)
  - Presence of AI artifacts
- Sort by risk, SLA pressure, or recency
- Navigate into individual handoff detail pages

This view is optimized for **fast triage without hiding system state**.

---

### Handoff Detail View

Each handoff has a dedicated detail page containing:

#### Core Metadata

- Status, priority, and escalation reason
- SLA due timestamp and breach indicator
- Ticket and customer references

#### AI Artifacts (Read‑Only)

Each artifact section shows:

- Last update timestamp
- Structured content rendered for readability
- Optional raw JSON view for audit/debugging

Artifacts never overwrite or mask operator decisions.

---

### Explicit Operator Actions

Operators can perform **explicit, guarded actions**:

| Action | Behavior |
|------|---------|
| **Draft Reply** | Enqueues an async request to generate a reply suggestion |
| **Run Risk Check** | Enqueues a non‑authoritative risk assessment |
| **Assign to Me** | Claims the handoff for the current operator |
| **Mark Resolved** | Resolves the handoff with a human decision |

Important notes:

- AI actions enqueue **outbox events** handled asynchronously by the backend
- “Draft Reply” and “Run Risk Check” may already exist if generated earlier
- Backend may respond with **409 conflicts** (e.g. already claimed / already resolved) — these are **intentional safety guards**, not errors

The UI surfaces backend responses verbatim to preserve operational transparency.

---

## Design Principles

- **Human authority first**  
  AI informs decisions — humans make them.

- **No hidden automation**  
  Every AI action is explicitly triggered and observable.

- **Failure‑safe by design**  
  AI outages never block core workflows.

- **Strict separation of concerns**  
  The UI never executes business logic or policy decisions.

- **Auditability over convenience**  
  Visibility and traceability are preferred over automation.

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- Server Components & Server Actions
- Typed REST communication with backend API

The UI is intentionally thin and stateless, delegating all policy and persistence to the backend.

---

## Running the Admin Console

### Prerequisites

- Node.js 18+
- FlowOps AI backend running locally

### Installation

```bash
npm install
```

### Environment Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:3000
NEXT_PUBLIC_OPERATOR_TOKEN=operator-token
```

### Run (recommended port)

```bash
npm run dev -- -p 3001
```

The admin console will be available at:

```
http://localhost:3001
```

> ⚠️ Keep backend and admin UI on separate ports to avoid conflicts.

---

## Folder Structure (Simplified)

```
src/
  app/
    page.tsx                → Redirects to /handoffs
    handoffs/
      page.tsx              → Handoff list view
      [id]/
        page.tsx            → Handoff detail view
  lib/
    api.ts                  → Typed backend API helpers
```

---

## Common Behaviors & Gotchas

- **409 responses are expected**
  - Already claimed
  - Already resolved
  - Invalid state transitions

- **Draft / Risk buttons may appear “instant”**
  - Artifacts may already exist from prior runs
  - Backend is idempotent by design

- **UI does not retry AI automatically**
  - Operators remain in control of retries

---

## Roadmap

Planned improvements:

1. **UI ergonomics**
   - Improved loading & empty states
   - Collapsible artifact sections
   - Better long‑text handling

2. **Operator tooling**
   - Copy‑to‑clipboard helpers
   - Artifact diffing
   - Inline annotations

3. **Risk‑aware workflows**
   - Risk‑weighted queues
   - SLA pressure indicators
   - Escalation heatmaps

4. **Authentication & roles**
   - Login flows
   - Read‑only vs action‑capable users

5. **Production hardening**
   - Error boundaries
   - Audit banners
   - Environment‑safe configuration

---

## Philosophy

This UI is **not a chatbot frontend**.

It is an **operations console** for humans supervising AI‑assisted workflows in environments where **trust, accountability, and safety matter**.

> Trust is built through visibility — not automation.

---

## Author

**Martin Enke**

This project explores how AI systems can be built to be:

- transparent  
- constrained  
- auditable  
- and genuinely useful in real operational environments
