"use client";
import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from "react";
import { api,signIn,disconnectWallet,watchWallet } from "@/lib/client/wallet";
import type { Me,Activity,Refund } from "@/lib/wallet-types";
import type { AuctionView } from "./auction-progress";
export type AuctionSnapshot={auctions:AuctionView[];ready:boolean;network?:{test:boolean;id:number;label:string;token:string;countdownSeconds:number};serverNow?:number;bids:{id:string;auctionId:string;amount:string;status:string;paymentHash:`0x${string}`|null}[]};
export type PreviewFixture={me:Me|null;view:AuctionSnapshot;activity:Activity;refunds?:Refund[]};
type WalletState={me:Me|null;view:AuctionSnapshot|null;activity:Activity|null;busy:boolean;walletLocked:boolean;setWalletLocked:(value:boolean)=>void;error:string;readOnly:boolean;clockOffset:number;previewRefunds:Refund[];refresh:()=>Promise<void>;login:(mobile?:boolean)=>Promise<void>;logout:()=>Promise<void>};
const EMPTY_REFUNDS:Refund[]=[];
const Context=createContext<WalletState|null>(null);
export function useWallet(){const value=useContext(Context);if(!value)throw new Error("WalletProvider is missing");return value;}
export function WalletProvider({children,fixture}:{children:ReactNode;fixture?:PreviewFixture}){
 const [me,setMe]=useState<Me|null>(fixture?.me||null);const [view,setView]=useState<AuctionSnapshot|null>(fixture?.view||null);const [activity,setActivity]=useState<Activity|null>(fixture?.activity||null);const [busy,setBusy]=useState(false);const [walletLocked,setWalletLocked]=useState(false);const [error,setError]=useState("");const [clockOffset,setClockOffset]=useState(0);const loggingIn=useRef(false);const generation=useRef(0);const meRef=useRef(me);const invalidated=useRef(false);meRef.current=me;
 const refresh=useCallback(async()=>{if(fixture)return;const version=generation.current;const [identity,snapshot]=await Promise.all([api<{me:Me|null}>("/api/me",undefined,"GET"),api<AuctionSnapshot>("/api/auctions",undefined,"GET")]);if(version!==generation.current||invalidated.current)return;setMe(identity.me);setView(snapshot);setClockOffset((snapshot.serverNow||Date.now())-Date.now());if(identity.me){const history=await api<Activity>("/api/activity",undefined,"GET");if(version===generation.current&&!invalidated.current)setActivity(history);}else setActivity(null);},[fixture]);
 useEffect(()=>{if(fixture){setMe(fixture.me);setView(fixture.view);setActivity(fixture.activity);setClockOffset((fixture.view.serverNow||Date.now())-Date.now());return;}const update=()=>refresh().catch(e=>setError((e as Error).message));update();const timer=setInterval(update,10000);return()=>clearInterval(timer);},[fixture,refresh]);
 useEffect(()=>{if(fixture)return;return watchWallet(address=>{const current=meRef.current;if(loggingIn.current||!current||address?.toLowerCase()===current.walletAddress.toLowerCase())return;invalidated.current=true;generation.current++;setMe(null);setActivity(null);api("/api/auth/logout").catch(()=>setError("Wallet changed. Reconnect to sign in again."));});},[fixture,me?.walletAddress]);
 const login=async(mobile=false)=>{if(fixture)return;loggingIn.current=true;setBusy(true);setError("");generation.current++;try{const identity=await signIn(mobile);invalidated.current=false;setMe(identity);await refresh();}catch(e){setError((e as Error).message);throw e;}finally{loggingIn.current=false;setBusy(false);}};
 const logout=async()=>{if(fixture)return;setBusy(true);setError("");generation.current++;try{await api("/api/auth/logout");invalidated.current=false;setMe(null);setActivity(null);await disconnectWallet();await refresh();}catch(e){setError((e as Error).message);throw e;}finally{setBusy(false);}};
 return <Context.Provider value={{me,view,activity,busy,walletLocked,setWalletLocked,error,readOnly:!!fixture,clockOffset,previewRefunds:fixture?.refunds||EMPTY_REFUNDS,refresh,login,logout}}>{children}</Context.Provider>;
}
