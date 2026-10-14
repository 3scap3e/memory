-- Update only auctions that have no accepted first bid.
UPDATE "MemoryAuction" SET "openingAmount" = CASE id
  WHEN 'kingston-64' THEN 225000000
  WHEN 'corsair-128' THEN 375000000
  WHEN 'suprim-4090' THEN 1025000000
END WHERE "currentBidId" IS NULL AND id IN ('kingston-64','corsair-128','suprim-4090');

CREATE TABLE "MemoryAuctionAction" (
  "id" TEXT NOT NULL,
  "auctionId" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousDeadline" TIMESTAMP(3),
  "newDeadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemoryAuctionAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MemoryAuctionAction_auctionId_createdAt_idx" ON "MemoryAuctionAction"("auctionId", "createdAt");
ALTER TABLE "MemoryAuctionAction" ADD CONSTRAINT "MemoryAuctionAction_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "MemoryAuction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
