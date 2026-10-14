export type AuctionAction = "start_countdown" | "close";
export function isAdminWallet(address: string, configured: string | null | undefined) {
  return (configured || "").split(",").map(v => v.trim().toLowerCase()).filter(v => /^0x[0-9a-f]{40}$/.test(v)).includes(address.toLowerCase());
}
export function assertManualAction(input: { action: AuctionAction; status: string; currentBidId: string | null; endsAt: Date | null; pendingUntil: Date | null; unpaidRefunds: number; now: Date }) {
  if (input.status === "closed") throw new Error("This auction is already closed");
  if (!input.currentBidId) throw new Error("An accepted paid bid is required first");
  if (input.action === "start_countdown" && input.endsAt) throw new Error("The countdown has already started");
  if (input.action === "close" && input.pendingUntil && input.pendingUntil > input.now) throw new Error("A bidder is completing payment. Wait for that payment window to settle.");
  if (input.action === "close" && input.unpaidRefunds > 0) throw new Error("Settle the outstanding refunds before closing this auction");
}
