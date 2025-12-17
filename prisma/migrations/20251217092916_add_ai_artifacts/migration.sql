-- CreateTable
CREATE TABLE "AiArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handoffId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT,
    "promptHash" TEXT,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiArtifact_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "Handoff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiArtifact_handoffId_idx" ON "AiArtifact"("handoffId");

-- CreateIndex
CREATE INDEX "AiArtifact_type_idx" ON "AiArtifact"("type");

-- CreateIndex
CREATE INDEX "AiArtifact_status_idx" ON "AiArtifact"("status");
