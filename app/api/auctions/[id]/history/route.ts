import { AUCTION_ITEMS } from "@/lib/auction-rules";
import { db } from "@/lib/server/db";
import { env, HttpError, route } from "@/lib/server/http";
export const GET = route(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!AUCTION_ITEMS.some(item => item.id === id)) throw new HttpError(404, "Auction not found");
  if (!env("DATABASE_URL")) return Response.json({ bids: [] });
  const bids = await db().memoryBid.findMany({
    where: { auctionId: id, status: "accepted" },
    orderBy: { acceptedAt: "desc" }, take: 100,
    select: { id: true, amount: true, paidOnChainAt: true, acceptedAt: true },
  });
  const refunds = await db().memoryPayout.findMany({
    where: { auctionId: id, reason: "outbid", triggeringBid: { previousBidId: { in: bids.map(b => b.id) } } },
    select: { amount: true, reward: true, fee: true, status: true, triggeringBid: { select: { previousBidId: true } } },
  });
  return Response.json({ bids: bids.map(b => {
    const refund = refunds.find(r => r.triggeringBid.previousBidId === b.id);
    return { amount: b.amount.toString(), date: (b.paidOnChainAt ?? b.acceptedAt)?.toISOString() ?? null,
      refund: refund ? { reward: (refund.reward - refund.fee).toString(), amount: refund.amount.toString(), status: refund.status === "paid" ? "paid" : "pending" } : null };
  }) });
});
