import Fastify from "fastify";
import dotenv from "dotenv";

import { getAccountStatus } from "./tools/accountTool";
import { decideRefund, shouldEscalate } from "./agent/policy";
import { runFlowOpsAgent } from "./agent/flowAgent";
import { ChatRequest } from "./agent/types";

dotenv.config();

const server = Fastify({ logger: true });

server.get("/", async () => {
  return { message: "FlowOps AI is running. Try /health" };
});

server.get("/health", async () => {
  return { status: "ok", service: "FlowOps AI" };
});

// Debug: tools
server.get("/debug/account/:customerId", async (req) => {
  const { customerId } = req.params as { customerId: string };
  return getAccountStatus({ customerId });
});

// Debug: policy
server.get("/debug/policy/refund/:plan/:amount", async (req) => {
  const { plan, amount } = req.params as { plan: string; amount: string };
  return decideRefund({ plan: plan as any, refundableAmount: Number(amount) });
});

server.get("/debug/policy/escalate/:plan/:confidence/:verified", async (req) => {
  const { plan, confidence, verified } = req.params as {
    plan: string;
    confidence: string;
    verified: string;
  };

  return shouldEscalate({
    plan: plan as any,
    confidence: Number(confidence),
    verificationPassed: verified === "true"
  });
});

// Main: chat channel
server.post("/chat", async (req) => {
  const body = req.body as ChatRequest;
  return runFlowOpsAgent(body);
});

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
