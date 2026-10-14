-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "MemoryUser" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorySession" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorySession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "MemoryNonce" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryAuction" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 0,
    "currentBidId" TEXT,
    "pendingBidId" TEXT,
    "pendingUntil" TIMESTAMP(3),
    "currentAmount" BIGINT NOT NULL DEFAULT 0,
    "countdownStartedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "winningBidId" TEXT,
    "extensions" INTEGER NOT NULL DEFAULT 0,
    "extensionBaseline" BIGINT NOT NULL DEFAULT 0,
    "extensionVolume" BIGINT NOT NULL DEFAULT 0,
    "extensionWindowStartedAt" TIMESTAMP(3),
    "openingAmount" BIGINT NOT NULL DEFAULT 25000000,
    "poolAmount" BIGINT NOT NULL DEFAULT 0,
    "rewardAmount" BIGINT NOT NULL DEFAULT 0,
    "feeReserve" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryAuction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryBid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "previousBidId" TEXT,
    "expectedVersion" INTEGER NOT NULL,
    "feeCap" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'quoted',
    "submittedHash" TEXT,
    "paymentHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "paidOnChainAt" TIMESTAMP(3),
    "extensionCycle" INTEGER,

    CONSTRAINT "MemoryBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryPayout" (
    "id" TEXT NOT NULL,
    "triggeringBidId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "principal" BIGINT NOT NULL,
    "reward" BIGINT NOT NULL,
    "fee" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "txHash" TEXT,
    "nonce" INTEGER,
    "signedTransaction" TEXT,
    "gasCostWei" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "MemoryPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemoryUser_walletAddress_key" ON "MemoryUser"("walletAddress");

-- CreateIndex
CREATE INDEX "MemorySession_userId_idx" ON "MemorySession"("userId");

-- CreateIndex
CREATE INDEX "MemoryNonce_address_createdAt_idx" ON "MemoryNonce"("address", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryBid_paymentHash_key" ON "MemoryBid"("paymentHash");

-- CreateIndex
CREATE INDEX "MemoryBid_auctionId_status_idx" ON "MemoryBid"("auctionId", "status");

-- CreateIndex
CREATE INDEX "MemoryBid_userId_createdAt_idx" ON "MemoryBid"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryPayout_triggeringBidId_key" ON "MemoryPayout"("triggeringBidId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryPayout_txHash_key" ON "MemoryPayout"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryPayout_nonce_key" ON "MemoryPayout"("nonce");

-- CreateIndex
CREATE INDEX "MemoryPayout_status_createdAt_idx" ON "MemoryPayout"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MemorySession" ADD CONSTRAINT "MemorySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MemoryUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryBid" ADD CONSTRAINT "MemoryBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "MemoryAuction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryBid" ADD CONSTRAINT "MemoryBid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MemoryUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryPayout" ADD CONSTRAINT "MemoryPayout_triggeringBidId_fkey" FOREIGN KEY ("triggeringBidId") REFERENCES "MemoryBid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

