/*
  Warnings:

  - You are about to drop the column `error` on the `AiArtifact` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `AiArtifact` table. All the data in the column will be lost.
  - You are about to drop the column `promptHash` on the `AiArtifact` table. All the data in the column will be lost.
  - Made the column `outputJson` on table `AiArtifact` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handoffId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiArtifact_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "Handoff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AiArtifact" ("createdAt", "handoffId", "id", "inputJson", "outputJson", "status", "type", "updatedAt") SELECT "createdAt", "handoffId", "id", "inputJson", "outputJson", "status", "type", "updatedAt" FROM "AiArtifact";
DROP TABLE "AiArtifact";
ALTER TABLE "new_AiArtifact" RENAME TO "AiArtifact";
CREATE INDEX "AiArtifact_handoffId_idx" ON "AiArtifact"("handoffId");
CREATE INDEX "AiArtifact_type_idx" ON "AiArtifact"("type");
CREATE UNIQUE INDEX "AiArtifact_handoffId_type_key" ON "AiArtifact"("handoffId", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
