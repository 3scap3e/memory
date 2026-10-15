import { auctionNetwork } from "@/lib/network";
import { countdownMs } from "@/lib/server/chain";
import { currentUser } from "@/lib/server/auth";
import { auctionViews } from "@/lib/server/auctions";
import { AUCTION_ITEMS, MAX_REFUND_FEE, minimumBid } from "@/lib/auction-rules";
import { env, route } from "@/lib/server/http";
export const GET = route(async () => {
  const n=auctionNetwork();const network={test:n.test,id:n.chain.id,label:n.label,token:n.token,countdownSeconds:countdownMs()/1000};
  if (!env("DATABASE_URL")) return Response.json({ network,auctions: AUCTION_ITEMS.map(item => ({ id: item.id, currentAmount: "0", startingAmount: item.startingAmount.toString(), nextAmount: minimumBid(0n, item.startingAmount).toString(), status: "preparing", busy: false, endsAt: null, extensions: 0, extensionBaseline: "0", extensionVolume: "0" })), bids: [], ready: false, maxRefundFee: MAX_REFUND_FEE.toString() });
  const user = await currentUser(); return Response.json({...await auctionViews(user?.id),network});
});
