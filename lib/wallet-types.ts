import type { Address } from "viem";
import type { BidState } from "./activity-rules";
export type Me = { id: string; walletAddress: Address; isAdmin?: boolean };
export type WalletBid = { id: string; auctionId: string; title: string; amount: string; state: BidState; createdAt: string; paymentHash: string | null; refund: { id: string; amount: string; principal: string; reward: string; fee: string; status: string; txHash: string | null } | null };
export type Activity = { bids: WalletBid[]; totals: { returned: string; rewards: string; pending: string }; wins: string[] };
export type Refund = { id: string; auctionId: string; title: string; recipient: Address; principal: string; reward: string; fee: string; amount: string; status: string; txHash: string | null; submittedRefundHash: string | null; reason: string; lastError: string | null };
