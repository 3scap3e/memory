import "server-only";
import { Prisma } from "@prisma/client";
import { getAddress, isHash, type Address, type Hash } from "viem";
import { AUCTION_ITEMS, MAX_REFUND_FEE, minimumBid, parseAmount, settlement } from "../auction-rules";
import { db } from "./db";
import { HttpError } from "./http";
import { clockNow, confirmationGraceMs, finalQuotePauseMs, quoteDeadlineBufferMs, estimateFee, ready, requirePayments,requireNetwork, treasury, verifyPayment, verifyRefund } from "./chain";
import { updateClock } from "./closing";
const sendJson = (value: unknown) => JSON.parse(JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v));
export async function seedAuctions() {
  for (const item of AUCTION_ITEMS) await db().memoryAuction.upsert({ where: { id: item.id }, update: {}, create: { id: item.id, title: item.title, openingAmount: item.startingAmount } });
}
export async function auctionViews(userId?: string) {
  await seedAuctions();
  const now = await clockNow();
  const auctions = await db().memoryAuction.findMany();
  const bids = userId ? await db().memoryBid.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }) : [];
  return { auctions: sendJson(auctions.map(a => ({ id: a.id, currentAmount: a.currentAmount, startingAmount: a.openingAmount, nextAmount: minimumBid(a.currentAmount, a.openingAmount), poolAmount: a.poolAmount, status: a.status, endsAt: a.endsAt, extensions: a.extensions, extensionBaseline: a.extensionBaseline, extensionVolume: a.extensionVolume, busy: !!a.pendingUntil && a.pendingUntil > now }))), bids: sendJson(bids.map(b => ({ id: b.id, auctionId: b.auctionId, amount: b.amount, status: b.status, paymentHash: b.paymentHash ?? b.submittedHash, expiresAt: b.expiresAt }))), ready: ready(), serverNow: now.getTime(), maxRefundFee: MAX_REFUND_FEE.toString() };
}
export async function createQuote(auctionId: string, userId: string, raw: unknown) {
  await requirePayments();
  let amount: bigint;
  try { amount = parseAmount(raw); } catch (e) { throw new HttpError(400, (e as Error).message); }
  const snapshot = await db().memoryAuction.findUnique({ where: { id: auctionId } });
  const fee = snapshot?.currentAmount ? await estimateFee() : 0n;
  return db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${auctionId} FOR UPDATE`;
    const a = await tx.memoryAuction.findUnique({ where: { id: auctionId } });
    if (!a || a.status !== "open") throw new HttpError(409, "This auction is not open");
    if (a.currentAmount > 0n && fee === 0n) throw new HttpError(409, "The opening bid was just placed. Request a fresh quote.");
    const now = await clockNow();
    const bidder = await tx.memoryUser.findUniqueOrThrow({ where: { id: userId } });
    if (bidder.walletAddress.toLowerCase() === treasury().toLowerCase()) throw new HttpError(400, "Use a separate bidder wallet; the treasury cannot bid against itself");
    if (a.endsAt && a.endsAt.getTime() - now.getTime() < finalQuotePauseMs()) throw new HttpError(409, "The countdown is ending. New payments are paused to allow confirmation.");
    if (a.pendingUntil && a.pendingUntil > now) throw new HttpError(409, "Another bidder is completing payment. Try again shortly.");
    const pendingRefund = await tx.memoryPayout.findFirst({ where: { auctionId, status: { not: "paid" } } });
    if (pendingRefund) throw new HttpError(409, "The previous refund is still settling. Try again shortly.");
    const previous = a.currentBidId ? await tx.memoryBid.findUnique({ where: { id: a.currentBidId } }) : null;
    if (previous?.userId === userId) throw new HttpError(409, "You already hold the current bid");
    if (amount < minimumBid(a.currentAmount, a.openingAmount)) throw new HttpError(400, "Bid at least the displayed minimum");
    if (a.pendingBidId) await tx.memoryBid.updateMany({ where: { id: a.pendingBidId, status: "quoted" }, data: { status: "expired" } });
    const expiresAt = new Date(Math.min(now.getTime() + 10 * 60_000, (a.endsAt?.getTime() ?? Infinity) - quoteDeadlineBufferMs()));
    const bid = await tx.memoryBid.create({ data: { auctionId, userId, amount, previousBidId: a.currentBidId, expectedVersion: a.version, feeCap: a.currentAmount > 0n ? fee : 0n, expiresAt } });
    await tx.memoryAuction.update({ where: { id: a.id }, data: { pendingBidId: bid.id, pendingUntil: new Date(expiresAt.getTime() + confirmationGraceMs()) } });
    return { id: bid.id, amount: amount.toString(), fee: bid.feeCap.toString(), maxRefundFee: MAX_REFUND_FEE.toString(), expiresAt, treasury: treasury(), previousAmount: a.currentAmount.toString() };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function ownBid(id: string, userId: string) {
  const bid = await db().memoryBid.findUnique({ where: { id }, include: { user: true, payout: true } });
  if (!bid || bid.userId !== userId) throw new HttpError(404, "Bid not found");
  return bid;
}
export async function confirmBid(id: string, userId: string, rawHash: unknown) {
  await requireNetwork();
  if (typeof rawHash !== "string" || !isHash(rawHash)) throw new HttpError(400, "Invalid transaction hash");
  const bid = await ownBid(id, userId);
  if (bid.paymentHash && bid.paymentHash !== rawHash) throw new HttpError(409, "A different payment is already attached to this bid");
  if (bid.status === "accepted" || bid.status === "rejected" || bid.status === "failed") return { status: bid.status };
  // Verify the exact signed-in sender, native USDC contract, recipient, amount,
  // timestamp and confirmation depth before changing auction state.
  const verification = await verifyPayment(rawHash as Hash, getAddress(bid.user.walletAddress), bid.amount, bid.createdAt);
  if (verification.state === "not_found") {
    // An unverified hash must not claim the global unique payment reference.
    await db().memoryBid.update({ where: { id }, data: { submittedHash: rawHash } });
    return { status: "confirming" };
  }
  const paidAt = verification.paidAt!;
  if (verification.state === "confirming") {
    const existing = await db().memoryBid.findFirst({ where: { paymentHash: rawHash, id: { not: bid.id } } });
    if (existing) throw new HttpError(409, "Payment already used by another bid");
    await db().memoryBid.update({ where: { id }, data: { paymentHash: rawHash, submittedHash: rawHash } });
    return { status: "confirming" };
  }
  const status = await db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${bid.auctionId} FOR UPDATE`;
    const fresh = await tx.memoryBid.findUniqueOrThrow({ where: { id } });
    if (["accepted", "rejected"].includes(fresh.status)) return fresh.status;
    const used = await tx.memoryBid.findFirst({ where: { paymentHash: rawHash, id: { not: id } } });
    if (used) throw new HttpError(409, "Payment already used by another bid");
    const a = await tx.memoryAuction.findUniqueOrThrow({ where: { id: bid.auctionId } });
    if (a.version !== bid.expectedVersion || a.currentBidId !== bid.previousBidId || a.status !== "open" || a.pendingBidId !== id || paidAt > bid.expiresAt || (a.endsAt && paidAt >= a.endsAt)) {
      // A late payment never becomes an underbid and never earns a reward.
      // Its entire principal is owed back; gas must be funded separately.
      await tx.memoryBid.update({ where: { id }, data: { status: "rejected", paymentHash: rawHash } });
      await tx.memoryPayout.create({ data: { triggeringBidId: id, auctionId: a.id, recipient: bid.user.walletAddress, principal: bid.amount, reward: 0n, fee: 0n, amount: bid.amount, reason: "late_payment", status: "needs_gas_funding" } });
      if (a.pendingBidId === id) await tx.memoryAuction.update({ where: { id: a.id }, data: { pendingBidId: null, pendingUntil: null } });
      return "rejected";
    }
    const split = settlement(a.currentAmount, bid.amount, bid.feeCap);
    if (bid.previousBidId) {
      const previous = await tx.memoryBid.findUniqueOrThrow({ where: { id: bid.previousBidId }, include: { user: true } });
      await tx.memoryPayout.create({ data: { triggeringBidId: id, auctionId: a.id, recipient: previous.user.walletAddress, principal: split.principal, reward: split.grossReward, fee: split.fee, amount: split.payout, reason: "outbid" } });
    }
    await tx.memoryBid.update({ where: { id }, data: { status: "accepted", paymentHash: rawHash, acceptedAt: new Date(), paidOnChainAt: paidAt } });
    await tx.memoryAuction.update({ where: { id: a.id }, data: { currentBidId: id, currentAmount: bid.amount, version: { increment: 1 }, poolAmount: { increment: split.retained }, rewardAmount: { increment: split.grossReward }, feeReserve: { increment: split.fee }, pendingBidId: null, pendingUntil: null } });
    await updateClock(tx, a.id, paidAt, bid.amount, bid.id);
    return "accepted";
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { status };
}
export async function cancelQuote(id: string, userId: string) {
  return db().$transaction(async tx => {
    const found = await tx.memoryBid.findUnique({ where: { id } });
    if (!found || found.userId !== userId) throw new HttpError(404, "Bid not found");
    await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${found.auctionId} FOR UPDATE`;
    const bid = await tx.memoryBid.findUniqueOrThrow({ where: { id } });
    if (bid.paymentHash || bid.submittedHash || bid.status !== "quoted") throw new HttpError(409, "Payment may already be in progress. Verify it instead.");
    await tx.memoryBid.update({ where: { id }, data: { status: "cancelled" } });
    await tx.memoryAuction.updateMany({ where: { id: bid.auctionId, pendingBidId: id }, data: { pendingBidId: null, pendingUntil: null } });
  });
}
export async function confirmManualRefund(id: string, raw: unknown) {
  await requireNetwork();
  if (typeof raw !== "string" || !isHash(raw)) throw new HttpError(400, "Enter a valid refund transaction hash");
  const payout = await db().memoryPayout.findUnique({ where: { id } });
  if (!payout) throw new HttpError(404, "Refund not found");
  if (payout.txHash && payout.txHash !== raw) throw new HttpError(409, "A different transaction is already attached to this refund");
  if (payout.status === "paid") return { status: "paid" };
  const result = await verifyRefund(raw as Hash, payout.recipient as Address, payout.amount, payout.createdAt);
  if (!result.confirmed) {
    await db().memoryPayout.update({ where: { id }, data: { submittedRefundHash: raw, ...(result.matched ? { txHash: raw } : {}) } });
    return { status: "confirming" };
  }
  await db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${payout.auctionId} FOR UPDATE`;
    const used = await tx.memoryPayout.findFirst({ where: { txHash: raw, id: { not: id } } });
    if (used) throw new HttpError(409, "This transaction already settled another refund");
    const claimed = await tx.memoryPayout.updateMany({ where: { id, status: { not: "paid" } }, data: { status: "paid", txHash: raw, submittedRefundHash: raw, paidAt: new Date(), gasCostWei: result.gasCost, lastError: null } });
    if (claimed.count) await tx.memoryAuction.update({ where: { id: payout.auctionId }, data: { feeReserve: { decrement: payout.fee } } });
  });
  return { status: "paid" };
}
export async function settlePayouts() {
  // Reconcile transfers approved by the owner. Never sign or send on the server.
  const rows = await db().memoryPayout.findMany({ where: { submittedRefundHash: { not: null }, status: { not: "paid" } }, take: 30 });
  for (const row of rows) {
    try { await confirmManualRefund(row.id, row.submittedRefundHash); }
    catch (e) { await db().memoryPayout.update({ where: { id: row.id }, data: { lastError: e instanceof HttpError ? e.message : "Could not verify the refund yet" } }); }
  }
  return rows.length;
}

export async function sweepIncoming() {
  const bids = await db().memoryBid.findMany({ where: { submittedHash: { not: null }, status: { notIn: ["accepted", "rejected"] } }, orderBy: { createdAt: "asc" }, take: 30 });
  for (const bid of bids) {
    try { await confirmBid(bid.id, bid.userId, bid.submittedHash); }
    catch (error) {
      // Invalid or reverted candidates do not earn bids, rewards or clock time.
      // Transient RPC errors remain eligible for the next reconciliation pass.
      if (error instanceof HttpError && error.status === 400) {
        await db().$transaction(async tx => {
          await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${bid.auctionId} FOR UPDATE`;
          await tx.memoryBid.updateMany({ where: { id: bid.id, status: { notIn: ["accepted", "rejected"] } }, data: { status: "failed", submittedHash: null } });
          await tx.memoryAuction.updateMany({ where: { id: bid.auctionId, pendingBidId: bid.id }, data: { pendingBidId: null, pendingUntil: null } });
        });
      }
    }
  }
  return bids.length;
}
