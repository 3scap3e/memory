"use client";
import { useState } from "react";
import { useWallet } from "../wallet-context";
import { formatAmount } from "@/lib/auction-rules";
import { transactionUrl } from "@/lib/network";
import { api } from "@/lib/client/wallet";
import WinnerShipping from "./WinnerShipping";
import ShippingQueue from "@/owner-ui/shipping-queue";
import RefundQueue from "@/owner-ui/refund-queue";
import styles from "./Account.styles";
const labels={current:"CURRENT BID",won:"WON",outbid:"OUTBID",payment_pending:"PAYMENT PENDING",not_accepted:"NOT ACCEPTED",cancelled:"CANCELLED"};
export default function MemoryActivity(){
 const {me,activity,readOnly,refresh}=useWallet();
 const [actionError,setActionError]=useState("");const [syncing,setSyncing]=useState(false);
 async function sync(){if(readOnly)return;setSyncing(true);setActionError("");try{await api("/api/admin/sync");await refresh();}catch(e){setActionError((e as Error).message);}finally{setSyncing(false);}}
 return <details className={styles.activitySection} open><summary>MEMORY · BIDS &amp; RETURNS</summary>
 <dl className="wallet-totals"><div><dt>REWARDS RECEIVED</dt><dd>{formatAmount(activity?.totals.rewards||"0")} USDC</dd></div><div><dt>TOTAL RETURNED</dt><dd>{formatAmount(activity?.totals.returned||"0")} USDC</dd></div><div><dt>RETURNS PENDING</dt><dd>{formatAmount(activity?.totals.pending||"0")} USDC</dd></div></dl>
 {activity?.wins.length?<details className="wallet-wins" open><summary>YOU WON</summary>{activity.bids.filter(b=>b.state==="won").map(b=><WinnerShipping key={b.auctionId} auctionId={b.auctionId} title={b.title}/>)}</details>:null}
 <details className={styles.activityEntry} open><summary>BID HISTORY</summary>{!activity?.bids.length?<p>You haven’t made any bids yet.</p>:activity.bids.map(b=><details className={styles.activityEntry} key={b.id} open={b.state==="current"||b.state==="won"}><summary>{b.title} <span className={`bid-state ${b.state}`}>{labels[b.state]}</span></summary><p className="wallet-bid-amount">{formatAmount(b.amount)} USDC</p>{b.refund&&<dl className="refund-breakdown"><dt>Original bid</dt><dd>{formatAmount(b.refund.principal)} USDC</dd><dt>Reward before fee</dt><dd>{formatAmount(b.refund.reward)} USDC</dd><dt>Outgoing fee</dt><dd>−{formatAmount(b.refund.fee)} USDC</dd><dt>{b.refund.status==="paid"?"RETURNED":"RETURN PENDING"}</dt><dd>{formatAmount(b.refund.amount)} USDC</dd></dl>}{b.paymentHash&&transactionUrl(b.paymentHash)&&<a href={transactionUrl(b.paymentHash)!} target="_blank" rel="noopener noreferrer">BID TRANSACTION ↗</a>}</details>)}</details>
 {process.env.NODE_ENV === "development" && me?.isAdmin&&<><details className={styles.activityEntry}><summary>OWNER TOOLS</summary><button type="button" disabled={syncing||readOnly} onClick={()=>sync()}>CHECK PAYMENTS & CLOCKS</button><RefundQueue /><ShippingQueue /></details></>}
 {actionError&&<p role="alert" className="bid-error">{actionError}</p>}
 </details>;
}
