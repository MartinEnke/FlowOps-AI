-- CreateTable
CREATE TABLE "Handoff" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Handoff_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Handoff_customerId_idx" ON "Handoff"("customerId");

-- CreateIndex
CREATE INDEX "Handoff_status_idx" ON "Handoff"("status");
