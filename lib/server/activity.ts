import "server-only";
import { db } from "./db";
import { bidState, receivedTotals } from "../activity-rules";
export async function walletActivity(userId: string, address: string) {
  const [bids, payouts] = await Promise.all([
    db().memoryBid.findMany({ where: { userId }, include: { auction: true }, orderBy: { createdAt: "desc" } }),
    db().memoryPayout.findMany({ where: { recipient: address }, include: { triggeringBid: true } }),
  ]);
  const totals=receivedTotals(payouts);
  const rows=bids.map(b=>{
    // The refund belongs to the previous bidder, not the bidder whose payment
    // triggered it. Late-payment returns belong to the triggering bid itself.
    const refund=payouts.find(p=>p.reason === "outbid" ? p.triggeringBid.previousBidId === b.id : p.triggeringBidId === b.id);
    return {id:b.id,auctionId:b.auctionId,title:b.auction.title,amount:b.amount.toString(),state:bidState(b,b.auction),createdAt:b.createdAt.toISOString(),paymentHash:b.paymentHash??b.submittedHash,refund:refund?{id:refund.id,amount:refund.amount.toString(),principal:refund.principal.toString(),reward:refund.reward.toString(),fee:refund.fee.toString(),status:refund.status,txHash:refund.txHash}:null};
  });
  return {bids:rows,totals:{returned:totals.returned.toString(),rewards:totals.rewards.toString(),pending:totals.pending.toString()},wins:rows.filter(b=>b.state === "won").map(b=>b.title)};
}
export async function refundQueue() {
  const rows=await db().memoryPayout.findMany({include:{triggeringBid:{include:{auction:true}}},orderBy:{createdAt:"desc"}});
  return rows.map(p=>({id:p.id,auctionId:p.auctionId,title:p.triggeringBid.auction.title,recipient:p.recipient,principal:p.principal.toString(),reward:p.reward.toString(),fee:p.fee.toString(),amount:p.amount.toString(),status:p.status,txHash:p.txHash,submittedRefundHash:p.submittedRefundHash,reason:p.reason,lastError:p.lastError}));
}
