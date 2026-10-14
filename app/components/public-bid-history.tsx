"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/wallet";
import { formatAmount } from "@/lib/auction-rules";
export default function PublicBidHistory({ productId, currentAmount }: { productId: string; currentAmount?: string }) {
  const [open, setOpen] = useState(false);
  const [bids, setBids] = useState<{ amount: string; date: string | null; refund: {reward: string; amount: string; status: string} | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError("");
    const update = async () => {
      try { const result = await api<{ bids: typeof bids }>(`/api/auctions/${productId}/history`, undefined, "GET"); if (active) { setBids(result.bids); setError(""); } }
      catch { if (active) setError("Couldn’t load bid history. Please try again."); }
      finally { if (active) setLoading(false); }
    };
    void update(); const timer = setInterval(update, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [open, productId, currentAmount]);
  return <details className="public-bid-history" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>BID HISTORY</summary>
    {loading ? <p role="status">LOADING…</p> : error ? <p role="alert">{error}</p> : !bids.length ? <p>No accepted bids yet.</p> : <>
      <ol>{bids.map((bid, index) => <li key={`${bid.date}-${index}`}><time dateTime={bid.date ?? undefined}>{bid.date ? new Date(bid.date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</time><div className="public-bid-amount"><span>{formatAmount(bid.amount)} USDC</span>{bid.refund && <small className={bid.refund.status === "paid" ? "reward-paid" : "reward-pending"}>+{formatAmount(bid.refund.reward)} USDC REWARD{bid.refund.status === "paid" ? "" : " PENDING"}<br/>{formatAmount(bid.refund.amount)} USDC {bid.refund.status === "paid" ? "RETURNED" : "RETURN PENDING"}</small>}</div></li>)}</ol>
      {bids.length === 100 && <p>Latest 100 accepted bids.</p>}
    </>}
  </details>;
}
