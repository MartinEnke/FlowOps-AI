import { prisma } from "../db/prisma";

async function main() {
  const rows = await prisma.aiArtifact.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, handoffId: true, type: true, status: true, createdAt: true }
  });
  console.log(rows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
