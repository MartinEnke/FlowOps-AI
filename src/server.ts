import Fastify from "fastify";
import dotenv from "dotenv";
import { getAccountStatus } from "./tools/accountTool";



dotenv.config();

const server = Fastify({
  logger: true
});

server.get("/", async () => {
  return { message: "FlowOps AI is running. Try /health" };
});

server.get("/debug/account/:customerId", async (req) => {
  const { customerId } = req.params as { customerId: string };
  return getAccountStatus({ customerId });
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 FlowOps AI running on http://localhost:3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
