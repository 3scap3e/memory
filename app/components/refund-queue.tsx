"use client";
import { useEffect,useState } from "react";
import type { Address } from "viem";
import { api,payBid } from "@/lib/client/wallet";
import { formatAmount } from "@/lib/auction-rules";
import { transactionUrl,isAnvil } from "@/lib/network";
import type { Refund } from "@/lib/wallet-types";
import { useWallet } from "./wallet-context";
export default function RefundQueue(){
 const {me,readOnly,refresh,previewRefunds}=useWallet();const [rows,setRows]=useState<Refund[]>([]);const [treasury,setTreasury]=useState<Address|null>(null);const [hashes,setHashes]=useState<Record<string,string>>({});const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState("");const [message,setMessage]=useState("");
 async function load(){if(readOnly)return;const data=await api<{refunds:Refund[];treasury:Address}>("/api/admin/refunds",undefined,"GET");setRows(data.refunds);setTreasury(data.treasury);}
 useEffect(()=>{if(readOnly){setRows(previewRefunds);setTreasury(me?.walletAddress||null);return;}load().catch(e=>setError((e as Error).message));},[readOnly,previewRefunds]);
 async function verify(row:Refund,hash:string){const result=await api<{status:string}>(`/api/admin/refunds/${row.id}`,{hash});setMessage(result.status==="paid"?"Refund verified and recorded.":"Waiting for transaction confirmation. Check again shortly.");await load();await refresh();}
 async function submit(row:Refund,send:boolean){if(readOnly)return;setBusy(row.id);setError("");try{let hash=hashes[row.id]||row.submittedRefundHash||row.txHash||"";if(send){if(!treasury||me?.walletAddress.toLowerCase()!==treasury.toLowerCase())throw new Error("Send this transfer from the treasury wallet, then paste its transaction hash here.");hash=await payBid(treasury,row.recipient,row.amount);setHashes(s=>({...s,[row.id]:hash}));}await verify(row,hash);}catch(e){setError((e as Error).message);}finally{setBusy(null);}}
 return <section className="refund-queue"><h3>REFUND QUEUE</h3><p>You approve each transfer in your wallet. The app records it only after checking the USDC transfer.</p>{readOnly&&<p>Design preview. Live refund actions are disabled.</p>}{rows.length===0?<p>No refund obligations.</p>:rows.map(row=><article className="wallet-bid" key={row.id}>
 <div className="wallet-bid-heading"><h4>{row.title}</h4><span className="bid-state">{row.status==="paid"?"PAID":"RETURN PENDING"}</span></div><p className="wallet-address">TO: {row.recipient}</p>
 <dl className="refund-breakdown"><dt>Original bid</dt><dd>{formatAmount(row.principal)} USDC</dd><dt>Reward</dt><dd>{formatAmount(row.reward)} USDC</dd><dt>Outgoing fee</dt><dd>−{formatAmount(row.fee)} USDC</dd><dt>Total to return</dt><dd>{formatAmount(row.amount)} USDC</dd></dl>
 {row.status!=="paid"?<><button type="button" disabled={readOnly||!!busy||!!row.submittedRefundHash||!!hashes[row.id]||!treasury||me?.walletAddress.toLowerCase()!==treasury.toLowerCase()} onClick={()=>submit(row,true)}>SEND REFUND IN WALLET</button><label>OR PASTE THE TRANSFER HASH<input type="text" value={hashes[row.id]??row.submittedRefundHash??""} onChange={e=>setHashes(s=>({...s,[row.id]:e.target.value}))} placeholder="0x…" /></label><button type="button" disabled={readOnly||!!busy} onClick={()=>submit(row,false)}>{busy===row.id?"VERIFYING…":"VERIFY REFUND"}</button></>:row.txHash&&transactionUrl(row.txHash)?<a href={transactionUrl(row.txHash)!} target="_blank" rel="noopener noreferrer">VIEW VERIFIED TRANSFER ↗</a>:<p>Transfer verified on {isAnvil()?"Anvil":"Base"}.</p>}
 </article>)}{message&&<p role="status">{message}</p>}{error&&<p className="bid-error" role="alert">{error}</p>}</section>;
}
