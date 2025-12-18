# FlowOps Admin Console

The **FlowOps Admin Console** is the internal operator interface for **FlowOps AI**.

It provides a human-in-the-loop UI for inspecting handoffs, reviewing AI-generated artifacts, and performing controlled operational actions.  
The console is intentionally designed as a **decision-support tool**, not an autonomous system.

---

## Purpose

The admin UI exists to give operators:
- Full visibility into active and historical handoffs
- Transparent access to AI-generated artifacts
- Explicit control over escalation, claiming, and resolution
- A safe interface to *request* AI assistance without delegating authority

AI outputs are **review-only by default**.

---

## Current Capabilities

### Handoff Overview
- List all active handoffs
- View status, priority, reason, and SLA state
- Navigate into individual handoff detail pages

### Handoff Detail View
For each handoff, operators can inspect:

- **Core handoff metadata**
  - Status, priority, reason
  - SLA due / breached state

- **AI Artifacts (read-only)**
  - `handoff_summary.v1`
  - `reply_draft.v1`
  - `risk_assessment.v1`

Artifacts are:
- Versioned
- Timestamped
- Fully auditable
- Never auto-applied

### Explicit AI Triggers
Operators may manually request AI assistance:

| Action | Description |
|------|------------|
| Generate Draft | Produces a customer-facing reply suggestion |
| Generate Risk | Produces a non-authoritative risk assessment |
| Claim | Claims the handoff for manual handling |
| Resolve | Resolves the handoff |

All AI triggers enqueue async outbox events handled by the backend.

---

## Design Principles

- **Human authority first**  
  AI suggests — humans decide.

- **No hidden automation**  
  Every AI action is explicitly triggered and visible.

- **Strict separation of concerns**  
  UI does not execute business logic or policy.

- **Failure-safe by design**  
  If AI fails, the system continues normally.

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Tailwind CSS**
- Server Components + Server Actions
- Backend communication via REST endpoints

---

## Running the Admin Console

### Prerequisites
- Node.js 18+
- FlowOps AI backend running locally

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
   - Better loading & empty states
   - Improved contrast and readability
   - Long-text wrapping & truncation controls

2. **Operator ergonomics**
   - Inline artifact diffing
   - Copy-to-clipboard helpers
   - Collapsible artifact sections

3. **Risk-aware sorting & filters**
   - Sort handoffs by risk level
   - SLA pressure highlighting
   - Attention queues for operators

4. **Authentication & roles**
   - Operator login
   - Read-only vs. action-capable roles

5. **Production hardening**
   - Error boundaries
   - Audit banners
   - Environment-safe configs

---

## Philosophy

This UI is **not** a chatbot frontend.  
It is an **operational console** for humans supervising AI-assisted workflows.

> Trust is built through visibility, not automation.

---

## Author

**Martin Enke**

FlowOps AI is an exploration of how AI systems can be:
- transparent
- constrained
- auditable
- and genuinely useful in real operations
