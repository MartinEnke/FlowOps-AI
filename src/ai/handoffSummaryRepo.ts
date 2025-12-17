import { prisma } from "../db/prisma";

export async function getHandoffSummaryArtifact(handoffId: string) {
  return prisma.aiArtifact.findUnique({
    where: { handoffId_type: { handoffId, type: "handoff_summary.v1" } },
    select: {
      id: true,
      handoffId: true,
      type: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      outputJson: true
    }
  });
}
