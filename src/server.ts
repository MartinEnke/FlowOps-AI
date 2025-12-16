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

// Debug: tools
server.get(
  "/debug/account/:customerId",
  async (req: FastifyRequest<{ Params: { customerId: string } }>) => {
    return getAccountStatus({ customerId: req.params.customerId });
  }
);

// Debug: policy
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
  async (req: FastifyRequest<{ Params: { plan: string; confidence: string; verified: string } }>) => {
    return shouldEscalate({
      plan: req.params.plan as any,
      confidence: Number(req.params.confidence),
      verificationPassed: req.params.verified === "true"
    });
  }
);

server.get("/debug/handoffs", async (req, reply) => {
  const rows = await prisma.handoff.findMany({
    where: { status: "pending" },
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
      issues: h.issuesJson ? JSON.parse(h.issuesJson) : [],
      actions: h.actionsJson ? JSON.parse(h.actionsJson) : [],
      createdAt: h.createdAt
    }))
  );
});



// Debug: DB interactions
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




// Main: chat channel
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
