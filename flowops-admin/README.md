# AI-Assisted Operations Console

The **AI-Assisted Operations Console** is the internal operator interface for the AI-Assisted Operations Platform.

It provides a **human-in-the-loop operations UI** for inspecting handoffs, reviewing AI-generated artifacts, and performing controlled, accountable actions.

The console is intentionally designed as a **decision-support system**, not an autonomous agent interface.

---

## Purpose

The admin UI exists to give operators:

- Full visibility into active and historical handoffs
- Transparent access to all AI-generated artifacts
- Explicit control over claiming, escalation, and resolution
- A safe interface to *request* AI assistance without delegating authority

AI outputs are **assistive and review-only by default**.

---

## Current Capabilities

### Handoff Overview

Operators can:

- View all active handoffs
- Inspect status, priority, reason, and SLA state
- Navigate into individual handoff detail views

This view supports fast triage and workload awareness without hiding system state.

---

### Handoff Detail View

For each handoff, operators can inspect:

#### Core Handoff Metadata
- Status and priority
- Escalation reason
- SLA due / breached state

#### AI Artifacts (read-only)

The system may attach structured AI artifacts such as:

- `handoff_summary.v1` — contextual briefing for operators
- `risk_assessment.v1` — non-authoritative risk signals and attention flags
- `reply_draft.v1` — editable, customer-facing response drafts

All artifacts are:

- Versioned
- Timestamped
- Persisted
- Fully auditable
- Never auto-applied

---

### Explicit AI Triggers

Operators may manually request AI assistance via explicit actions:

| Action | Description |
|------|------------|
| **Draft Reply** | Generates a customer-facing reply suggestion |
| **Run Risk Check** | Produces a structured, non-authoritative risk assessment |
| **Assign to Me** | Claims the handoff for manual handling |
| **Mark Resolved** | Resolves the handoff with a human decision |

All AI actions enqueue **asynchronous outbox events** handled by the backend.  
If AI fails, the handoff remains fully operable.

---

## Design Principles

- **Human authority first**  
  AI informs decisions — humans make them.

- **No hidden automation**  
  Every AI action is explicitly triggered and visible.

- **Strict separation of concerns**  
  The UI never executes business logic or policy.

- **Failure-safe by design**  
  AI errors never block operators or core workflows.

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- Server Components + Server Actions
- Backend communication via typed REST endpoints

---

## Running the Admin Console

### Prerequisites
- Node.js 18+
- AI-Assisted Operations backend running locally

### Install
```bash
npm install
```

### Environment
Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:3000
```

### Run
```bash
npm run dev
```

The UI will be available at:
```
http://localhost:3001
```

> Tip: Keep backend and admin UI on separate ports to avoid conflicts.

---

## Folder Structure (Simplified)

```
src/
  app/
    page.tsx                → Redirects to /handoffs
    handoffs/
      page.tsx              → Handoff list
      [id]/
        page.tsx            → Handoff detail view
  lib/
    api.ts                  → Typed backend API helpers
```

---

## What’s Next

Planned improvements (in order):

1. **UI state refinements**
   - Improved loading and empty states
   - Better contrast and readability
   - Long-text wrapping and truncation controls

2. **Operator ergonomics**
   - Inline artifact diffing
   - Copy-to-clipboard helpers
   - Collapsible artifact sections

3. **Risk-aware prioritization**
   - Sorting by risk level
   - SLA pressure highlighting
   - Attention-based operator queues

4. **Authentication & roles**
   - Operator login
   - Read-only vs. action-capable roles

5. **Production hardening**
   - Error boundaries
   - Audit banners
   - Environment-safe configuration

---

## Philosophy

This UI is **not a chatbot frontend**.

It is an **operations console** for humans supervising AI-assisted workflows in environments where trust, accountability, and safety matter.

> Trust is built through visibility, not automation.

---

## Author

**Martin Enke**

This project explores how AI systems can be built to be:
- transparent  
- constrained  
- auditable  
- and genuinely useful in real operational environments
