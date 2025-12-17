// src/server.ts

import Fastify, { FastifyRequest } from "fastify";
import dotenv from "dotenv";

import { getAccountStatus } from "./tools/accountTool";
import { decideRefund, shouldEscalate } from "./agent/policy";
import { runFlowOpsAgent } from "./agent/flowAgent";
import { ChatRequest } from "./agent/types";
import { prisma } from "./db/prisma";

import { buildAuditBundle } from "./audit/export";
import { toCsv, flattenAuditToRows } from "./audit/csv";

dotenv.config();

const server = Fastify({ logger: true });

server.get("/", async () => {
  return { message: "FlowOps AI is running. Try /health" };
});

server.get("/health", async () => {
  return { status: "ok", service: "FlowOps AI" };
});

// --------------------
// Debug: tools
// --------------------
server.get(
  "/debug/account/:customerId",
  async (req: FastifyRequest<{ Params: { customerId: string } }>) => {
    return getAccountStatus({ customerId: req.params.customerId });
  }
);

// --------------------
// Debug: policy
// --------------------
server.get(
  "/debug/policy/refund/:plan/:amount",
  async (req: FastifyRequest<{ Params: { plan: string; amount: string } }>) => {
    return decideRefund({
      plan: req.params.plan as any,
      refundableAmount: Number(req.params.amount)
    });
  }
);

server.get(
  "/debug/policy/escalate/:plan/:confidence/:verified",
  async (
    req: FastifyRequest<{
      Params: { plan: string; confidence: string; verified: string };
    }>
  ) => {
    return shouldEscalate({
      plan: req.params.plan as any,
      confidence: Number(req.params.confidence),
      verificationPassed: req.params.verified === "true"
    });
  }
);

// --------------------
// Debug: handoff queue
// --------------------
// Supports:
//   GET /debug/handoffs
//   GET /debug/handoffs?status=pending|claimed|resolved
//   GET /debug/handoffs?id=<handoffId>
//   GET /debug/handoffs?status=pending&id=<handoffId>
server.get(
  "/debug/handoffs",
  async (
    req: FastifyRequest<{ Querystring: { status?: string; id?: string } }>,
    reply
  ) => {
    const status = req.query?.status?.trim();
    const id = req.query?.id?.trim();

    const where: { status?: string; id?: string } = {};
    if (status) where.status = status;
    if (id) where.id = id;

    const rows = await prisma.handoff.findMany({
      ...(Object.keys(where).length ? { where } : {}),
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return reply.send(
      rows.map((h) => ({
        id: h.id,
        customerId: h.customerId,
        ticketId: h.ticketId,
        reason: h.reason,
        priority: h.priority,
        mode: h.mode,
        confidence: h.confidence,
        status: h.status,

        // 7.4 workflow fields
        claimedBy: h.claimedBy ?? null,
        claimedAt: h.claimedAt ?? null,
        resolvedBy: h.resolvedBy ?? null,
        resolvedAt: h.resolvedAt ?? null,
        resolutionNotes: h.resolutionNotes ?? null,

        issues: h.issuesJson ? JSON.parse(h.issuesJson) : [],
        actions: h.actionsJson ? JSON.parse(h.actionsJson) : [],
        createdAt: h.createdAt,
        updatedAt: h.updatedAt
      }))
    );
  }
);

// --------------------
// 7.4: Get a single handoff (human agent inspection)
// --------------------
// GET /handoffs/:id
server.get(
  "/handoffs/:id",
  async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = req.params;

    const h = await prisma.handoff.findUnique({ where: { id } });
    if (!h) return reply.code(404).send({ error: "Handoff not found" });

    return reply.send({
      id: h.id,
      customerId: h.customerId,
      ticketId: h.ticketId,
      reason: h.reason,
      priority: h.priority,
      mode: h.mode,
      confidence: h.confidence,
      status: h.status,

      claimedBy: h.claimedBy ?? null,
      claimedAt: h.claimedAt ?? null,
      resolvedBy: h.resolvedBy ?? null,
      resolvedAt: h.resolvedAt ?? null,
      resolutionNotes: h.resolutionNotes ?? null,

      issues: h.issuesJson ? JSON.parse(h.issuesJson) : [],
      actions: h.actionsJson ? JSON.parse(h.actionsJson) : [],
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
      slaDueAt: h.slaDueAt ?? null,
slaBreachedAt: h.slaBreachedAt ?? null,
    });
  }
);

// --------------------
// 7.4: Claim a handoff (atomic)
// --------------------
// POST /handoffs/:id/claim
// Header: x-agent-id: <string>
server.post(
  "/handoffs/:id/claim",
  async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { id } = req.params;
    const agentId = String(req.headers["x-agent-id"] || "").trim();

    if (!agentId) {
      return reply.code(400).send({ error: "Missing x-agent-id header" });
    }

    // Atomic claim: only succeeds if still pending and unclaimed
    const result = await prisma.handoff.updateMany({
      where: {
        id,
        status: "pending",
        claimedAt: null
      },
      data: {
        status: "claimed",
        claimedBy: agentId,
        claimedAt: new Date()
      }
    });

    if (result.count === 0) {
      return reply.code(409).send({
        error: "Handoff already claimed or not pending"
      });
    }

    const updated = await prisma.handoff.findUnique({ where: { id } });
    return reply.send(updated);
  }
);

// --------------------
// 7.4: Resolve a handoff (must be claimed + ownership enforced)
// --------------------
// POST /handoffs/:id/resolve
// Header: x-agent-id: <string>
// Body: { "resolutionNotes": "..." }
server.post(
  "/handoffs/:id/resolve",
  async (
    req: FastifyRequest<{
      Params: { id: string };
      Body: { resolutionNotes?: string };
    }>,
    reply
  ) => {
    const { id } = req.params;
    const agentId = String(req.headers["x-agent-id"] || "").trim();
    const resolutionNotes = req.body?.resolutionNotes?.trim() || null;

    if (!agentId) {
      return reply.code(400).send({ error: "Missing x-agent-id header" });
    }

    const h = await prisma.handoff.findUnique({ where: { id } });
    if (!h) return reply.code(404).send({ error: "Handoff not found" });

    // Better error messaging (polish)
    if (h.status === "resolved") {
      return reply.code(409).send({ error: "Handoff already resolved" });
    }

    if (h.status !== "claimed" || !h.claimedAt || !h.claimedBy) {
      return reply.code(409).send({
        error: "Handoff must be claimed before resolving"
      });
    }

    if (h.claimedBy !== agentId) {
      return reply.code(409).send({
        error: "Only the claiming agent can resolve"
      });
    }

    const updated = await prisma.handoff.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedBy: agentId,
        resolvedAt: new Date(),
        resolutionNotes
      }
    });

    if (updated.ticketId) {
  await prisma.ticket.updateMany({
    where: { id: updated.ticketId, status: { not: "resolved" } },
    data: { status: "resolved" }
  });
}

    return reply.send(updated);
  }
);

// --------------------
// 7.8: Metrics (ops dashboard)
// --------------------
// GET /metrics  -> JSON
// GET /metrics/dashboard -> tiny HTML view

server.get("/metrics", async (req, reply) => {
  // Tune these without schema changes
  const N = 50;

  // --- Handoff counts by status ---
  const [pendingCount, claimedCount, resolvedCount] = await Promise.all([
    prisma.handoff.count({ where: { status: "pending" } }),
    prisma.handoff.count({ where: { status: "claimed" } }),
    prisma.handoff.count({ where: { status: "resolved" } })
  ]);

  // --- Average resolution time (seconds) for resolved handoffs ---
  // Prisma can't "avg(resolvedAt - claimedAt)" directly in SQLite easily,
  // so we compute it in code from recent resolved handoffs.
  const recentResolved = await prisma.handoff.findMany({
    where: { status: "resolved" },
    orderBy: { resolvedAt: "desc" },
    take: 200,
    select: { claimedAt: true, resolvedAt: true }
  });

  const resolutionSeconds = recentResolved
    .map((h) => {
      if (!h.claimedAt || !h.resolvedAt) return null;
      return Math.max(0, (h.resolvedAt.getTime() - h.claimedAt.getTime()) / 1000);
    })
    .filter((x): x is number => typeof x === "number");

  const avgResolutionSeconds =
    resolutionSeconds.length > 0
      ? resolutionSeconds.reduce((a, b) => a + b, 0) / resolutionSeconds.length
      : null;

  // --- Interaction counts (for rates) ---
  const totalInteractions = await prisma.interaction.count();

  // Replay count = interactions that include "idempotency_replay" in actionsJson
  // (works with your current design; no schema change needed)
  const replayInteractions = await prisma.interaction.count({
    where: { actionsJson: { contains: "idempotency_replay" } }
  });

  // Escalation proxy = number of handoffs created (each handoff corresponds to an escalation path)
  const totalHandoffs = await prisma.handoff.count();

  const replayRate =
    totalInteractions > 0 ? replayInteractions / totalInteractions : 0;

  const escalationRate =
    totalInteractions > 0 ? totalHandoffs / totalInteractions : 0;

  // --- Confidence drift (last N vs previous N) ---
  const lastN = await prisma.interaction.findMany({
    orderBy: { createdAt: "desc" },
    take: N,
    select: { confidence: true }
  });

  const prevN = await prisma.interaction.findMany({
    orderBy: { createdAt: "desc" },
    skip: N,
    take: N,
    select: { confidence: true }
  });

  function avg(list: Array<{ confidence: number }>) {
    if (!list.length) return null;
    return list.reduce((sum, x) => sum + x.confidence, 0) / list.length;
  }

  const avgLastN = avg(lastN);
  const avgPrevN = avg(prevN);
  const confidenceDelta =
    avgLastN !== null && avgPrevN !== null ? avgLastN - avgPrevN : null;

  return reply.send({
    generatedAt: new Date().toISOString(),
    counts: {
      interactions: totalInteractions,
      handoffs: totalHandoffs
    },
    handoffs: {
      pending: pendingCount,
      claimed: claimedCount,
      resolved: resolvedCount,
      avgResolutionSeconds
    },
    idempotency: {
      replayCount: replayInteractions,
      replayRate
    },
    rates: {
      escalationRate
    },
    confidence: {
      N,
      avgLastN,
      avgPrevN,
      delta: confidenceDelta
    }
  });
});

server.get("/metrics/dashboard", async (req, reply) => {
  // Very small HTML dashboard (no framework) pulling /metrics
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>FlowOps AI — Metrics</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 12px; }
      .card { border: 1px solid #ddd; border-radius: 12px; padding: 12px 14px; }
      .k { color: #666; font-size: 12px; }
      .v { font-size: 24px; font-weight: 650; margin-top: 6px; }
      .small { font-size: 14px; color: #333; margin-top: 6px; }
      .muted { color: #666; }
      .row { display:flex; justify-content: space-between; gap: 10px; margin-top: 6px; }
      code { background: #f6f6f6; padding: 2px 6px; border-radius: 6px; }
      button { padding: 8px 10px; border-radius: 10px; border: 1px solid #ddd; background: white; cursor: pointer; }
    </style>
  </head>
  <body>
    <h2>FlowOps AI — Metrics</h2>
    <div class="muted">Auto-refresh: 5s · Source: <code>/metrics</code></div>
    <div style="margin:12px 0"><button id="refresh">Refresh</button></div>

    <div class="grid">
      <div class="card">
        <div class="k">Interactions</div>
        <div class="v" id="interactions">—</div>
      </div>
      <div class="card">
        <div class="k">Handoffs</div>
        <div class="v" id="handoffs">—</div>
        <div class="small muted" id="handoffBreakdown">—</div>
      </div>
      <div class="card">
        <div class="k">Escalation rate</div>
        <div class="v" id="escalationRate">—</div>
      </div>

      <div class="card">
        <div class="k">Replay rate</div>
        <div class="v" id="replayRate">—</div>
        <div class="small muted" id="replayCount">—</div>
      </div>
      <div class="card">
        <div class="k">Avg resolution time</div>
        <div class="v" id="avgResolution">—</div>
        <div class="small muted">(resolved handoffs)</div>
      </div>
      <div class="card">
        <div class="k">Confidence drift</div>
        <div class="v" id="confidenceDelta">—</div>
        <div class="small muted" id="confidenceDetails">—</div>
      </div>
    </div>

    <script>
      function pct(x) { return (x * 100).toFixed(1) + "%"; }
      function fmt(x) { return (x === null || x === undefined) ? "—" : x; }
      function secs(x) {
        if (x === null || x === undefined) return "—";
        if (x < 60) return Math.round(x) + "s";
        const m = Math.floor(x / 60);
        const s = Math.round(x % 60);
        return m + "m " + s + "s";
      }

      async function load() {
        const r = await fetch("/metrics");
        const m = await r.json();

        document.getElementById("interactions").textContent = m.counts.interactions;
        document.getElementById("handoffs").textContent = m.counts.handoffs;
        document.getElementById("handoffBreakdown").textContent =
          "pending " + m.handoffs.pending + " · claimed " + m.handoffs.claimed + " · resolved " + m.handoffs.resolved;

        document.getElementById("escalationRate").textContent = pct(m.rates.escalationRate);

        document.getElementById("replayRate").textContent = pct(m.idempotency.replayRate);
        document.getElementById("replayCount").textContent = "replays: " + m.idempotency.replayCount;

        document.getElementById("avgResolution").textContent = secs(m.handoffs.avgResolutionSeconds);

        const delta = m.confidence.delta;
        document.getElementById("confidenceDelta").textContent =
          (delta === null) ? "—" : (delta >= 0 ? "+" : "") + delta.toFixed(3);

        document.getElementById("confidenceDetails").textContent =
          "avg(last " + m.confidence.N + "): " + fmt(m.confidence.avgLastN?.toFixed(3)) +
          " · prev: " + fmt(m.confidence.avgPrevN?.toFixed(3));
      }

      document.getElementById("refresh").addEventListener("click", load);
      load();
      setInterval(load, 5000);
    </script>
  </body>
</html>`;

  reply.header("content-type", "text/html; charset=utf-8");
  return reply.send(html);
});


// --------------------
// Debug: DB interactions
// --------------------
server.get(
  "/debug/interactions/:customerId",
  async (req: FastifyRequest<{ Params: { customerId: string } }>) => {
    return prisma.interaction.findMany({
      where: { customerId: req.params.customerId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  }
);


// --------------------
// Debug: outbox
// --------------------
// GET /debug/outbox
// GET /debug/outbox?status=pending|processing|failed|dead|sent
server.get(
  "/debug/outbox",
  async (
    req: FastifyRequest<{ Querystring: { status?: string } }>,
    reply
  ) => {
    const status = req.query?.status?.trim();

    const rows = await prisma.outboxEvent.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return reply.send(
      rows.map((e) => ({
        id: e.id,
        type: e.type,
        status: e.status,
        attempts: e.attempts,
        nextAttemptAt: e.nextAttemptAt,
        lastError: e.lastError,
        idempotencyKey: e.idempotencyKey,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      }))
    );
  }
);

server.post(
  "/debug/handoffs/:id/force-sla-breach",
  async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const past = new Date(Date.now() - 60_000); // 1 min ago
    const updated = await prisma.handoff.update({
      where: { id: req.params.id },
      data: { slaDueAt: past }
    });
    return reply.send({ ok: true, id: updated.id, slaDueAt: updated.slaDueAt });
  }
);


// JSON
server.get(
  "/audit/export.json",
  async (
    req: FastifyRequest<{ Querystring: { customerId?: string; ticketId?: string } }>
  ) => {
    const customerId = req.query.customerId?.trim();
    const ticketId = req.query.ticketId?.trim();

    const params: { customerId?: string; ticketId?: string } = {};
    if (customerId) params.customerId = customerId;
    if (ticketId) params.ticketId = ticketId;

    return buildAuditBundle(params); // ✅ THIS is the fix
  }
);

// CSV
server.get(
  "/audit/export.csv",
  async (
    req: FastifyRequest<{ Querystring: { customerId?: string; ticketId?: string } }>,
    reply
  ) => {
    const customerId = req.query.customerId?.trim();
const ticketId = req.query.ticketId?.trim();

const params: { customerId?: string; ticketId?: string } = {};
if (customerId) params.customerId = customerId;
if (ticketId) params.ticketId = ticketId;

const bundle = await buildAuditBundle(params);

    const rows = flattenAuditToRows(bundle);
    const csv = toCsv(rows);

    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header(
      "content-disposition",
      `attachment; filename="flowops_audit_${bundle.scope.customerId}.csv"`
    );
    return reply.send(csv);
  }
);


// --------------------
// Main: chat channel
// --------------------
server.post(
  "/chat",
  async (req: FastifyRequest<{ Body: ChatRequest }>) => {
    return runFlowOpsAgent(req.body);
  }
);

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000;

    await server.ready();
    server.log.info("\n" + server.printRoutes());

    await server.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 FlowOps AI running on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
