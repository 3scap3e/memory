"use client";
import { useRef,useState } from "react";
import { useWallet } from "./wallet-context";
import { formatAmount } from "@/lib/auction-rules";
import { isAnvil,transactionUrl } from "@/lib/network";
import { api,mobileWalletEnabled } from "@/lib/client/wallet";
import AccountActivity from "./shared-account/AccountActivity";
import RefundQueue from "@/owner-ui/refund-queue";
const labels={current:"CURRENT BID",won:"WON",outbid:"OUTBID",payment_pending:"PAYMENT PENDING",not_accepted:"NOT ACCEPTED",cancelled:"CANCELLED"};
export default function WalletDock(){
 const [accountOpen,setAccountOpen]=useState(false);
 const {me,view,activity,busy,walletLocked,error,readOnly,login,logout,refresh}=useWallet();const dialog=useRef<HTMLDialogElement>(null);const [actionError,setActionError]=useState("");const [syncing,setSyncing]=useState(false);
 async function connect(mobile=false){try{await login(mobile);}catch{} }
 async function sync(seconds?:number){if(readOnly)return;setSyncing(true);setActionError("");try{await api(seconds?"/api/test/clock":"/api/admin/sync",seconds?{seconds}:undefined);await refresh();}catch(e){setActionError((e as Error).message);}finally{setSyncing(false);}}
 return <>
 <AccountActivity open={accountOpen&&!!me&&!readOnly} onClose={()=>setAccountOpen(false)} onDeleted={()=>{setAccountOpen(false);void logout().catch(()=>window.location.reload());}} />
 {isAnvil()&&!readOnly&&<p className="anvil-notice">ANVIL TEST · MOCK USDC ONLY · 24 HOURS = {view?.network?.countdownSeconds||60} TEST SECONDS</p>}
 <nav className="wallet-dock" aria-label="Wallet account">{me?<><span className="connected-wallet">{me.walletAddress.slice(0,6)}…{me.walletAddress.slice(-4)}</span><button type="button" onClick={()=>dialog.current?.showModal()}>MY BIDS</button><button type="button" disabled={readOnly} onClick={()=>setAccountOpen(true)}>ACCOUNT / ACTIVITY</button><button type="button" disabled={busy||walletLocked||readOnly} onClick={()=>logout().catch(()=>{})}>DISCONNECT</button></>:<><button type="button" disabled={busy||readOnly} onClick={()=>connect()}>{busy?"CONNECTING…":"CONNECT WALLET"}</button>{mobileWalletEnabled()&&!isAnvil()&&<button type="button" disabled={busy||readOnly} onClick={()=>connect(true)}>QR / MOBILE</button>}</>}</nav>
 {error&&<p className="wallet-dock-error" role="alert">{error}</p>}
 <dialog ref={dialog} className="bid-dialog wallet-dialog" aria-labelledby="wallet-heading"><div className="bid-dialog-heading"><h2 id="wallet-heading">MY BIDS & RETURNS</h2><button type="button" className="dialog-close" aria-label="Close wallet activity" onClick={()=>dialog.current?.close()}>×</button></div>
 {me&&<p className="wallet-address">{me.walletAddress}</p>}{readOnly&&<p className="preview-notice">DESIGN PREVIEW · NO PAYMENTS</p>}
 <dl className="wallet-totals"><div><dt>REWARDS RECEIVED</dt><dd>{formatAmount(activity?.totals.rewards||"0")} USDC</dd></div><div><dt>TOTAL RETURNED</dt><dd>{formatAmount(activity?.totals.returned||"0")} USDC</dd></div><div><dt>RETURNS PENDING</dt><dd>{formatAmount(activity?.totals.pending||"0")} USDC</dd></div></dl>
 {activity?.wins.length?<section className="wallet-wins"><h3>YOU WON</h3>{activity.wins.map(title=><p key={title}>{title}</p>)}<p>The item’s delivery is arranged with Stagerunner.</p></section>:null}
 <section className="wallet-history"><h3>BID HISTORY</h3>{!activity?.bids.length?<p>You haven’t made any bids yet.</p>:activity.bids.map(b=><article className="wallet-bid" key={b.id}><div className="wallet-bid-heading"><h4>{b.title}</h4><span className={`bid-state ${b.state}`}>{labels[b.state]}</span></div><p className="wallet-bid-amount">{formatAmount(b.amount)} USDC</p>{b.refund&&<dl className="refund-breakdown"><dt>Original bid</dt><dd>{formatAmount(b.refund.principal)} USDC</dd><dt>Reward before fee</dt><dd>{formatAmount(b.refund.reward)} USDC</dd><dt>Outgoing fee</dt><dd>−{formatAmount(b.refund.fee)} USDC</dd><dt>{b.refund.status==="paid"?"RETURNED":"RETURN PENDING"}</dt><dd>{formatAmount(b.refund.amount)} USDC</dd></dl>}{b.paymentHash&&transactionUrl(b.paymentHash)&&<a href={transactionUrl(b.paymentHash)!} target="_blank" rel="noopener noreferrer">BID TRANSACTION ↗</a>}</article>)}</section>
 {process.env.NODE_ENV === "development" && me?.isAdmin&&<><section className="wallet-owner-tools"><h3>OWNER TOOLS</h3><button type="button" disabled={syncing||readOnly} onClick={()=>sync()}>CHECK PAYMENTS & CLOCKS</button>{isAnvil()&&<button type="button" disabled={syncing||readOnly} onClick={()=>sync(61)}>ANVIL: ADVANCE 61 SECONDS</button>}</section><RefundQueue /></>}
 {actionError&&<p role="alert" className="bid-error">{actionError}</p>}
 </dialog>
 </>;
}
