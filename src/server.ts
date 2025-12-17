// src/server.ts

import Fastify, { FastifyRequest } from "fastify";
import dotenv from "dotenv";

import { getAccountStatus } from "./tools/accountTool";
import { decideRefund, shouldEscalate } from "./agent/policy";
import { runFlowOpsAgent } from "./agent/flowAgent";
import { ChatRequest } from "./agent/types";
import { prisma } from "./db/prisma";

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
      updatedAt: h.updatedAt
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
    await server.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 FlowOps AI running on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
