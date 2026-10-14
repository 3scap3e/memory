export type BidState = "current" | "won" | "outbid" | "payment_pending" | "not_accepted" | "cancelled";
export function bidState(bid: { id: string; status: string; paymentHash?: string | null }, auction: { currentBidId: string | null; winningBidId: string | null; status: string }) : BidState {
  if (bid.status === "accepted") {
    if (auction.status === "closed" && auction.winningBidId === bid.id) return "won";
    if (auction.status === "open" && auction.currentBidId === bid.id) return "current";
    return "outbid";
  }
  if (bid.status === "rejected" || bid.status === "failed") return "not_accepted";
  if (bid.status === "cancelled" || bid.status === "expired") return "cancelled";
  return "payment_pending";
}
export function receivedTotals(rows: { status: string; amount: bigint; reward: bigint; fee: bigint }[]) {
  return rows.reduce((s,row)=>row.status === "paid" ? { returned: s.returned+row.amount, rewards: s.rewards+row.reward-row.fee, pending: s.pending } : { ...s, pending:s.pending+row.amount },{returned:0n,rewards:0n,pending:0n});
}
