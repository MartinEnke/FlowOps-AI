-- DropIndex
DROP INDEX "Handoff_claimedBy_idx";

-- CreateIndex
CREATE INDEX "Handoff_ticketId_idx" ON "Handoff"("ticketId");
