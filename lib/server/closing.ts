import "server-only";
import type { Prisma } from "@prisma/client";
import { AUCTION_ITEMS,parseAmount } from "../auction-rules";
import { countBid, DAY_MS } from "../closing-rules";
import { assertManualAction, type AuctionAction } from "../admin-rules";
import { clockNow, countdownMs } from "./chain";
import { db } from "./db";
import { HttpError } from "./http";

type Database = Prisma.TransactionClient;
// Only the owner starts a countdown. No undisclosed price/customer/bidder
// thresholds are encoded here or serialized into a public API response.
export async function initialCountdownBaseline(tx: Database, a: { id: string; countdownStartedAt: Date | null; currentAmount: bigint; extensionBaseline: bigint }) {
  if (a.extensionBaseline > 0n) return a.extensionBaseline;
  if (!a.countdownStartedAt) return a.currentAmount;
  const initial = await tx.memoryBid.findFirst({ where: { auctionId: a.id, status: "accepted", paidOnChainAt: { lte: a.countdownStartedAt } }, orderBy: { paidOnChainAt: "desc" }, select: { amount: true } });
  return initial?.amount ?? a.currentAmount;
}
export async function updateClock(tx: Database, id: string, paidAt?: Date, amount?: bigint, bidId?: string) {
  const a = await tx.memoryAuction.findUniqueOrThrow({ where: { id } });
  if (!a.endsAt || a.status === "closed") return;
  const baseline = await initialCountdownBaseline(tx, a);
  const now = paidAt?.getTime() ?? (await clockNow()).getTime();
  const recent = await tx.memoryBid.aggregate({ where: { auctionId: id, status: "accepted", extensionCycle: a.extensions, paidOnChainAt: { gte: new Date(now - DAY_MS) } }, _sum: { amount: true } });
  const volume = recent._sum.amount ?? 0n;
  if (!paidAt || amount === undefined || !bidId || !a.countdownStartedAt || paidAt < a.countdownStartedAt) {
    if (volume !== a.extensionVolume || baseline !== a.extensionBaseline) await tx.memoryAuction.update({ where: { id }, data: { extensionVolume: volume, extensionBaseline: baseline } });
    return;
  }
  await tx.memoryBid.update({ where: { id: bidId }, data: { extensionCycle: a.extensions } });
  const result = countBid({ now, deadline: a.endsAt.getTime(), baseline, volume, amount, durationMs: countdownMs() });
  await tx.memoryAuction.update({ where: { id }, data: { endsAt: new Date(result.deadline), extensionBaseline: result.baseline, extensionVolume: result.volume, extensions: { increment: result.extended ? 1 : 0 }, ...(result.extended ? { extensionWindowStartedAt: paidAt } : {}) } });
}
export async function manualAction(id: string, action: AuctionAction, actor: string) {
  return db().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${id} FOR UPDATE`;
    const a = await tx.memoryAuction.findUnique({ where: { id } });
    if (!a) throw new HttpError(404, "Auction not found");
    const now = await clockNow();
    const unpaidRefunds = await tx.memoryPayout.count({ where: { auctionId: id, status: { not: "paid" } } });
    try { assertManualAction({ action, status: a.status, currentBidId: a.currentBidId, endsAt: a.endsAt, pendingUntil: a.pendingUntil, unpaidRefunds, now }); }
    catch (e) { throw new HttpError(409, (e as Error).message); }
    const endsAt = action === "start_countdown" ? new Date(now.getTime() + countdownMs()) : a.endsAt;
    const updated = await tx.memoryAuction.update({ where: { id }, data: action === "start_countdown" ? { endsAt, countdownStartedAt: now, extensionWindowStartedAt: now, extensionBaseline: a.currentAmount, extensionVolume: 0n } : { status: "closed", closedAt: now, winningBidId: a.currentBidId, version: { increment: 1 }, pendingBidId: null, pendingUntil: null } });
    await tx.memoryAuctionAction.create({ data: { auctionId: id, actor, action, previousDeadline: a.endsAt, newDeadline: updated.endsAt } });
    return { id: updated.id, status: updated.status, endsAt: updated.endsAt };
  });
}
export async function sweepClocks() {
  for (const item of AUCTION_ITEMS) {
    await db().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${item.id} FOR UPDATE`;
      const a = await tx.memoryAuction.findUnique({ where: { id: item.id } });
      if (!a || a.status !== "open") return;
      await updateClock(tx, item.id);
      const fresh = await tx.memoryAuction.findUniqueOrThrow({ where: { id: item.id } });
      const now = await clockNow();
      if (fresh.endsAt && fresh.endsAt <= now && (!fresh.pendingUntil || fresh.pendingUntil <= now)) {
        const unpaid = await tx.memoryPayout.count({ where: { auctionId: item.id, status: { not: "paid" } } });
        if (!unpaid && fresh.currentBidId) {
          await tx.memoryAuction.update({ where: { id: item.id }, data: { status: "closed", closedAt: new Date(), winningBidId: fresh.currentBidId, pendingBidId: null, pendingUntil: null } });
          await tx.memoryAuctionAction.create({ data: { auctionId: item.id, actor: "worker", action: "countdown_close", previousDeadline: fresh.endsAt, newDeadline: fresh.endsAt } });
        }
      }
    });
  }
}

export async function setOpeningMinimum(id:string,raw:unknown,actor:string){
 let amount:bigint;try{amount=parseAmount(raw);}catch(e){throw new HttpError(400,(e as Error).message);}
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${id} FOR UPDATE`;
  const a=await tx.memoryAuction.findUnique({where:{id}});if(!a)throw new HttpError(404,"Auction not found");
  const now=await clockNow();if(a.currentBidId||a.status!=="open")throw new HttpError(409,"Starting minimums can only change before the first paid bid");
  if(a.pendingUntil&&a.pendingUntil>now)throw new HttpError(409,"A payment quote is active. Wait for it to expire or be cancelled.");
  await tx.memoryAuction.update({where:{id},data:{openingAmount:amount,version:{increment:1},pendingBidId:null,pendingUntil:null}});
  await tx.memoryAuctionAction.create({data:{auctionId:id,actor,action:`set_starting_minimum:${amount.toString()}`}});
  return {startingAmount:amount.toString()};
 });
}
