"use client";
import { walletErrorMessage } from "@/lib/wallet-errors";
import { useEffect, useRef, useState } from "react";
import WinnerShipping from "./shared-account/WinnerShipping";
import AuctionProgress from "./auction-progress";
import type { Address, Hash } from "viem";
import { formatAmount, MAX_REFUND_FEE, AUCTION_ITEMS } from "@/lib/auction-rules";
import { api, mobileWalletEnabled, payBid } from "@/lib/client/wallet";

type Quote = { ownerWallet?:Address; id: string; amount: string; fee: string; treasury: Address; previousAmount: string; expiresAt: string };
type Pending = { auctionId?: string; id: string; hash: Hash; wallet: Address };
import { useWallet } from "./wallet-context";
import { isAnvil,transactionUrl } from "@/lib/network";
const storageKey=(wallet:string)=>`memory_pending_payment:${isAnvil()?"anvil":"base"}:${wallet.toLowerCase()}`;

export default function AuctionControls({ productId, title }: { productId: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const {me,view,refresh:reload,login:connect,readOnly,clockOffset,setWalletLocked}=useWallet();
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [openProduct, setOpenProduct] = useState({ id: productId, title });
  const [openingMinimum,setOpeningMinimum]=useState("");
  const [adminConfirmation, setAdminConfirmation] = useState(false);
  const startingAmount = AUCTION_ITEMS.find(item => item.id === productId)!.startingAmount;
  const auction = view?.auctions.find(a => a.id === productId);
  useEffect(()=>{setWalletLocked((!!quote&&!pending)||busy);return()=>setWalletLocked(false);},[quote,pending,busy,setWalletLocked]);
  useEffect(()=>{if(pending&&(!me||pending.wallet.toLowerCase()!==me.walletAddress.toLowerCase())){setPending(null);setMessage("");setError("");}if(quote&&(!me||quote.ownerWallet?.toLowerCase()!==me.walletAddress.toLowerCase()))setQuote(null);},[me?.walletAddress,pending,quote]);
  useEffect(() => {
    if (readOnly || !me || pending) return;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey(me.walletAddress)) || "null") as Pending | null;
      if (stored?.wallet.toLowerCase() === me.walletAddress.toLowerCase()) setPending(stored);
      else {
        const saved = view?.bids.find(b => b.paymentHash && !["accepted", "rejected", "failed"].includes(b.status));
        if (saved?.paymentHash) setPending({ auctionId: saved.auctionId, id: saved.id, hash: saved.paymentHash, wallet: me.walletAddress });
      }
    } catch { localStorage.removeItem(storageKey(me.walletAddress)); }
  }, [me, pending, view, readOnly]);
  useEffect(() => {
    if (readOnly || !pending || !me || pending.wallet.toLowerCase() !== me.walletAddress.toLowerCase()) return;
    let stopped = false;
    const check = async () => {
      try {
        const result = await api<{ status: string }>(`/api/auctions/bids/${pending.id}/confirm`, { hash: pending.hash });
        if (stopped) return;
        if (["accepted", "rejected", "failed"].includes(result.status)) {
          await reload();
          localStorage.removeItem(storageKey(pending.wallet)); setPending(null); setQuote(null); setError("");
          dialog.current?.close();
          setMessage(result.status === "accepted" ? "" : result.status === "failed" ? "The transaction failed. Your bid was not accepted. You can request a new quote." : "Your payment arrived after another bid. Your full payment is recorded for return; it has not been accepted as a bid.");
        }
      } catch (e) { if (!stopped) setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again.")); }
    };
    check(); const timer = setInterval(check, 6000);
    return () => { stopped = true; clearInterval(timer); };
  }, [pending, me, reload, readOnly]);

  function open() {
    setOpenProduct({ id: productId, title });
    setAmount(formatAmount(auction?.nextAmount || startingAmount));
    setOpeningMinimum(formatAmount(auction?.startingAmount||startingAmount));
    setAdminConfirmation(false);
    setError(""); if (!pending) setMessage(""); setAgreed(false);
    dialog.current?.showModal();
  }
  async function login(mobile = false) {
    setBusy(true); setError("");
    try { await connect(mobile); }
    catch (e) { setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again.")); }
    finally { setBusy(false); }
  }
  async function previewBid(event: React.FormEvent) {
    event.preventDefault(); if(readOnly)return; setBusy(true); setError("");
    try { if(!me)throw new Error("Connect your wallet first");const q=await api<Quote>(`/api/auctions/${openProduct.id}/quote`, { amount });setQuote({...q,ownerWallet:me.walletAddress}); }
    catch (e) { setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again.")); }
    finally { setBusy(false); }
  }
  async function pay() {
    if (readOnly || !quote || !me || !agreed || pending) return;
    if(quote.ownerWallet?.toLowerCase()!==me.walletAddress.toLowerCase()){setError("Reconnect the wallet that requested this quote.");return;}
    if (new Date(quote.expiresAt).getTime() <= Date.now() + clockOffset) { setError("This quote expired. Cancel it and request a new quote before paying."); return; }
    setBusy(true); setError(""); setMessage("Confirm the USDC transfer in your wallet.");
    try {
      const hash = await payBid(me.walletAddress, quote.treasury, quote.amount);
      const saved = { auctionId: openProduct.id, id: quote.id, hash, wallet: me.walletAddress };
      // Save immediately after broadcast so a reload can resume confirmation.
      setPending(saved);
      try { localStorage.setItem(storageKey(saved.wallet), JSON.stringify(saved)); } catch {}
      setMessage("");
      dialog.current?.close();
    } catch (e) { setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again.")); setMessage(""); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (busy) return;
    setError("");
    if (quote && !pending) {
      setBusy(true);
      try { await api(`/api/auctions/bids/${quote.id}`, undefined, "DELETE"); setQuote(null); }
      catch (e) { setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again.")); return; }
      finally { setBusy(false); }
    }
    dialog.current?.close();
  }
  async function updateOpeningMinimum(){
    if(readOnly)return;setBusy(true);setError("");
    try{await api(`/api/admin/auctions/${openProduct.id}`,{action:"set_starting_minimum",amount:openingMinimum});await reload();setMessage("Starting minimum updated.");}
    catch(e){setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again."));}finally{setBusy(false);}
  }
  async function manageAuction(action: "start_countdown" | "close") {
    if(readOnly)return; setBusy(true); setError("");
    try { await api(`/api/admin/auctions/${openProduct.id}`, { action }); setAdminConfirmation(false); setMessage(action === "close" ? "Auction closed. The current paid bidder is the winner." : "The 24-hour countdown has started."); await reload(); }
    catch (e) { setError(walletErrorMessage(e,"Couldn’t complete the request. Please check your wallet and try again.")); }
    finally { setBusy(false); }
  }
  const confirming = !!pending && (!pending.auctionId || pending.auctionId === productId);
  const ownBid = !!me && !!auction?.isYourBid;
  return <>
    <AuctionProgress auction={auction} serverNow={view?.serverNow} />
    {auction?.status === "closed" ? <div className="closed-auction-result" role="status"><span>WINNING BID:</span><span>{formatAmount(auction.currentAmount)} USDC</span></div> : <div aria-busy={confirming} className={`bid-row ${confirming ? "bid-confirming" : ""} ${ownBid ? "your-current-bid" : ""}`}>
      <div className="bid-field"><span>{auction?.currentAmount && auction.currentAmount !== "0" ? "CURRENT BID:" : "STARTING MIN:"}</span><span className="bid-value">{confirming ? <span className="bid-confirmation-loader" role="status" aria-label="Confirming your payment" /> : formatAmount(auction?.currentAmount && auction.currentAmount !== "0" ? auction.currentAmount : auction?.startingAmount || startingAmount)}</span></div>
      <div className="bid-field next-bid"><span>NEXT UP:</span><span className="bid-value">{formatAmount(auction?.nextAmount || startingAmount)}</span></div>
      <button className="bid-button" type="button" onClick={open} disabled={!!pending} aria-label={`Bid on ${title}`}>$</button>
    </div>}
    {ownBid && (auction?.status === "closed" ? <div className="your-bid-status winner-actions"><p role="status">YOU WON THIS AUCTION</p><WinnerShipping key={productId} auctionId={productId} title={title} compact /></div> : <p className="your-bid-status" role="status">YOUR BID IS ACTIVE · YOU’RE LEADING</p>)}
    {!confirming && auction?.busy && <p className="auction-status" role="status">ANOTHER BID IS SETTLING</p>}
    {error && pending && <p className="bid-error" role="alert">{error}</p>}
    {message && !dialog.current?.open && <p className="auction-feedback" role="status">{message}</p>}
    <dialog ref={dialog} className="bid-dialog" onCancel={e => { e.preventDefault(); void cancel(); }}>
      <div className="bid-dialog-heading"><h2>{openProduct.title}</h2><button type="button" className="dialog-close" disabled={busy} onClick={cancel} aria-label="Close bidding dialog">×</button></div>
      <p className="dialog-network">USDC ON BASE ONLY</p>
      {!me ? <div className="wallet-login">
        <p>Connect your wallet and sign the login message. Signing in does not transfer funds.</p>
        <button type="button" disabled={busy} onClick={() => login()}>CONNECT WALLET</button>
        {mobileWalletEnabled() && <button type="button" disabled={busy} onClick={() => login(true)}>MOBILE WALLET / QR</button>}
      </div> : <>
        <div className="signed-in"><span>{me.walletAddress.slice(0, 6)}…{me.walletAddress.slice(-4)}</span></div>
        {!view?.ready && <p className="dialog-notice">Auctions are being prepared. Payments are not open yet.</p>}
        {process.env.NODE_ENV === "development" && me.isAdmin && <div className="owner-controls">
          <p>OWNER CONTROLS</p>
          {(!auction?.currentAmount||auction.currentAmount==="0")&&<div><label htmlFor="opening-minimum">STARTING MINIMUM (USDC)</label><input id="opening-minimum" type="text" inputMode="decimal" value={openingMinimum} onChange={e=>setOpeningMinimum(e.target.value)} disabled={readOnly||busy}/><button type="button" disabled={readOnly||busy||!!quote||!!pending} onClick={updateOpeningMinimum}>UPDATE STARTING MINIMUM</button></div>}
          <button type="button" disabled={readOnly || busy || !!pending || !!quote || !!auction?.endsAt || !auction?.currentAmount || auction.currentAmount === "0" || auction.status === "closed"} onClick={() => manageAuction("start_countdown")}>START 24-HOUR COUNTDOWN</button>
          {!adminConfirmation ? <button type="button" disabled={readOnly || busy || !!pending || !!quote || !auction?.currentAmount || auction.currentAmount === "0" || auction.status === "closed"} onClick={() => setAdminConfirmation(true)}>CLOSE AUCTION…</button> : <div><p>Close this auction and make the current paid bidder the winner?</p><button type="button" disabled={busy} onClick={() => manageAuction("close")}>CONFIRM CLOSE</button><button type="button" disabled={busy} onClick={() => setAdminConfirmation(false)}>KEEP OPEN</button></div>}
        </div>}
        {pending ? <p className="payment-pending">Your payment is being checked. {transactionUrl(pending.hash)?<a href={transactionUrl(pending.hash)!} target="_blank" rel="noopener noreferrer">View transaction ↗</a>:<span>Local Anvil transaction.</span>}</p> : quote ? <div className="quote-preview">
          <dl><dt>Your bid</dt><dd>{formatAmount(quote.amount)} USDC</dd><dt>Incoming gas</dt><dd>Paid separately in ETH by your wallet</dd><dt>Outgoing fee quoted for this outbid transfer</dt><dd>{formatAmount(quote.fee)} USDC {quote.previousAmount === "0" ? "(no previous bidder to refund)" : "— deducted from the previous bidder’s reward"}</dd></dl>
          <p>When you are outbid, you receive your full bid plus one-third of the increase, minus the outgoing fee quoted at that time. The fee is capped at {formatAmount(MAX_REFUND_FEE)} USDC and comes only from your reward.</p>
          <p>The 24-hour countdown starts after the minimum price, unique bidders, and paying-customer targets are met. Cumulative bidding can add an extra day when its 10× target is reached.</p>
          <label className="bid-agreement"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={busy} />I understand the bid, fee policy, and closing conditions.</label>
          <button type="button" disabled={readOnly || busy || !agreed} onClick={pay}>{busy ? "CHECK YOUR WALLET…" : `PAY ${formatAmount(quote.amount)} USDC`}</button>
        </div> : <form onSubmit={previewBid}>
          <label htmlFor="bid-amount">YOUR BID (USDC)</label>
          <input id="bid-amount" type="text" inputMode="decimal" autoComplete="off" maxLength={15} value={amount} onChange={e => setAmount(e.target.value)} required disabled={readOnly || busy || !view?.ready} />
          <p>The opening bid must meet this auction’s specified starting minimum. Later bids must increase by at least 25 USDC. Outgoing gas comes only from the outbid bidder’s reward, up to 0.05 USDC.</p>
          <button type="submit" disabled={readOnly || busy || !view?.ready}>{busy ? "GETTING QUOTE…" : "REVIEW BID"}</button>
        </form>}
      </>}
      {message && <p className="auction-feedback" role="status">{message}</p>}
      {error && <p className="bid-error" role="alert">{error}</p>}
    </dialog>
  </>;
}
