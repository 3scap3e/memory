-- Keep opening bids positive; the 25 USDC increment applies after the first bid.
ALTER TABLE "MemoryAuction" ALTER COLUMN "openingAmount" SET DEFAULT 1;
UPDATE "MemoryAuction" SET "openingAmount" = 1 WHERE "currentBidId" IS NULL;
