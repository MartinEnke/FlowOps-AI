import { FastifyRequest, FastifyReply } from "fastify";
import { getOperatorByToken, OperatorRole } from "./operators";

export function requireRole(allowed: OperatorRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ")
      ? auth.slice("Bearer ".length)
      : undefined;

    const operator = getOperatorByToken(token);

    if (!operator) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Missing or invalid operator token"
      });
    }

    if (!allowed.includes(operator.role)) {
      return reply.status(403).send({
        error: "forbidden",
        message: "Operator does not have permission"
      });
    }

    // Attach operator context to request
    (req as any).operator = operator;
  };
}
