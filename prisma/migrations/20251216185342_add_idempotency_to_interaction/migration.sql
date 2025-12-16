/*
  Warnings:

  - A unique constraint covering the columns `[customerId,requestId]` on the table `Interaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN "requestId" TEXT;
ALTER TABLE "Interaction" ADD COLUMN "ticketId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Interaction_customerId_requestId_key" ON "Interaction"("customerId", "requestId");
