CREATE TABLE "MemoryShipment" (
 "id" TEXT NOT NULL,
 "auctionId" TEXT NOT NULL,
 "winnerBidId" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "address" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'address_received',
 "carrier" TEXT,
 "trackingNumber" TEXT,
 "updates" JSONB NOT NULL DEFAULT '[]',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MemoryShipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemoryShipment_auctionId_key" ON "MemoryShipment"("auctionId");
CREATE UNIQUE INDEX "MemoryShipment_winnerBidId_key" ON "MemoryShipment"("winnerBidId");
CREATE INDEX "MemoryShipment_userId_idx" ON "MemoryShipment"("userId");
ALTER TABLE "MemoryShipment" ADD CONSTRAINT "MemoryShipment_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "MemoryAuction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemoryShipment" ADD CONSTRAINT "MemoryShipment_winnerBidId_fkey" FOREIGN KEY ("winnerBidId") REFERENCES "MemoryBid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemoryShipment" ADD CONSTRAINT "MemoryShipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MemoryUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
