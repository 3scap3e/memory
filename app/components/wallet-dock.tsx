"use client";
import { useState } from "react";
import { useWallet } from "./wallet-context";
import { isAnvil } from "@/lib/network";
import { mobileWalletEnabled } from "@/lib/client/wallet";
import AccountActivity from "./shared-account/AccountActivity";
export default function WalletDock(){
 const [accountOpen,setAccountOpen]=useState(false);
 const {me,busy,walletLocked,readOnly,error,login,logout}=useWallet();
 async function connect(mobile=false){try{await login(mobile);}catch{} }
 return <>
 <AccountActivity open={accountOpen&&!!me} onClose={()=>setAccountOpen(false)} onDeleted={()=>{setAccountOpen(false);void logout().catch(()=>window.location.reload());}} onLogout={()=>{setAccountOpen(false);void logout().catch(()=>{});}} logoutDisabled={busy||walletLocked||readOnly} />
 <nav className="wallet-dock" aria-label="Wallet account">{me?<><span className="connected-wallet">{me.walletAddress.slice(0,6)}…{me.walletAddress.slice(-4)}</span><button type="button" onClick={()=>setAccountOpen(true)}>ACCOUNT / ACTIVITY</button></>:<><button type="button" disabled={busy||readOnly} onClick={()=>connect()}>{busy?"CONNECTING…":"CONNECT WALLET"}</button>{mobileWalletEnabled()&&!isAnvil()&&<button type="button" disabled={busy||readOnly} onClick={()=>connect(true)}>QR / MOBILE</button>}</>}</nav>
 {error && !readOnly && <p className="wallet-dock-error" role="alert">{error}</p>}
 </>;
}
