-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Handoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "ticketId" TEXT,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'med',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mode" TEXT NOT NULL,
    "confidence" REAL,
    "issuesJson" TEXT,
    "actionsJson" TEXT,
    "claimedBy" TEXT,
    "claimedAt" DATETIME,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Handoff_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Handoff_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Handoff" ("actionsJson", "confidence", "createdAt", "customerId", "id", "issuesJson", "mode", "priority", "reason", "status", "ticketId", "updatedAt") SELECT "actionsJson", "confidence", "createdAt", "customerId", "id", "issuesJson", "mode", "priority", "reason", "status", "ticketId", "updatedAt" FROM "Handoff";
DROP TABLE "Handoff";
ALTER TABLE "new_Handoff" RENAME TO "Handoff";
CREATE INDEX "Handoff_customerId_idx" ON "Handoff"("customerId");
CREATE INDEX "Handoff_status_idx" ON "Handoff"("status");
CREATE INDEX "Handoff_claimedBy_idx" ON "Handoff"("claimedBy");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
