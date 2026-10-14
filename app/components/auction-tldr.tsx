"use client";
import { useRef } from "react";
export default function AuctionTldr() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="tldr-button" onClick={() => dialog.current?.showModal()}>TLDR</button>
    <dialog ref={dialog} className="bid-dialog tldr-dialog" aria-labelledby="tldr-heading">
      <div className="bid-dialog-heading"><h2 id="tldr-heading">TLDR</h2><button type="button" className="dialog-close" aria-label="Close TLDR" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="tldr-copy">
        <p>USDC ON BASE. OPENING BID: AMOUNT SPECIFIED PER AUCTION, ABOVE ZERO. NEXT INCREASE: 25 USDC MIN.<br />WHEN OUTBID: YOUR FULL BID + 1/3 OF THE INCREASE, MINUS OUTGOING GAS.<br />GAS COMES ONLY FROM YOUR REWARD, CAPPED AT 0.05 USDC. STAGERUNNER KEEPS THE REST.</p>
        <p>WIN CONDITIONS:</p>
        <ol><li>MINIMUM ACCEPTED PRICE</li><li>UNIQUE BIDDERS</li><li>NUMBER OF REPLAYERS ON PARLEY DEV + PARLEY RUN</li></ol>
        <p>PARAMETERS OPEN FOR DISCOVERY.</p>
        <p>THE 24-HOUR COUNTDOWN FOR EACH AUCTION STARTS WHEN ALL THREE OF THEIR CONDITIONS ARE MET.</p>
      </div>
    </dialog>
  </>;
}
