"use client";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/auction-rules";
export type AuctionView = { id: string; isYourBid?: boolean; startingAmount: string; currentAmount: string; nextAmount: string; busy: boolean; status: string; endsAt: string | null; extensions: number; extensionBaseline: string; extensionVolume: string };
export default function AuctionProgress({ auction,serverNow }: { auction?: AuctionView;serverNow?:number }) {
  const [now, setNow] = useState(0);
  useEffect(() => { const offset=(serverNow||Date.now())-Date.now();const update = () => setNow(Date.now()+offset); update(); const timer = setInterval(update, 1000); return () => clearInterval(timer); }, [serverNow]);
  if (auction?.status === "closed") return <p className="minimum-label">AUCTION CLOSED.</p>;
  if (!auction?.endsAt) return <p className="minimum-label">MINIMUM CONDITIONS TO COUNTDOWN? NOT YET MET. CHECK BACK OR REVERSE ENGINEER TO DISCOVER TRIGGER</p>;
  const seconds = Math.max(0, Math.ceil((new Date(auction.endsAt).getTime() - now) / 1000));
  const time = `${Math.floor(seconds / 86400)}D ${Math.floor(seconds / 3600 % 24).toString().padStart(2, "0")}:${Math.floor(seconds / 60 % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const baseline = BigInt(auction.extensionBaseline && auction.extensionBaseline !== "0" ? auction.extensionBaseline : auction.currentAmount || "0");
  const target = baseline * 10n;
  return <div className="active-countdown">
    <p className="minimum-label">MINIMUM CONDITIONS TO COUNTDOWN? MET.</p>
    <p className="countdown-value">{now ? seconds > 0 ? time : "FINALIZING AUCTION" : "—"}</p>
    {(!now || seconds > 0) && <p className="countdown-extension-line">{formatAmount(target.toString())} USDC IN CUMULATIVE BIDS WITHIN 24 HOURS ADDS 24 HOURS TO THE EXISTING DEADLINE.</p>}
  </div>;
}
