"use client";
import { createWalletClient, custom, erc20Abi, type EIP1193Provider, type Address } from "viem";
import { auctionNetwork } from "../network";
import type { Me } from "../wallet-types";
type WatchedProvider=EIP1193Provider & {on?:(event:string,callback:(value:unknown)=>void)=>void;removeListener?:(event:string,callback:(value:unknown)=>void)=>void;disconnect?:()=>Promise<void>};
let chosen:WatchedProvider|null=null;
let sessionChange:((address:string|null)=>void)|null=null;
const accountsChanged=(value:unknown)=>sessionChange?.(Array.isArray(value)&&typeof value[0]==="string"?value[0]:null);
const disconnected=()=>sessionChange?.(null);
export function watchWallet(callback:(address:string|null)=>void){if(!chosen&&typeof window!=="undefined"){const injected=(window as unknown as {ethereum?:WatchedProvider}).ethereum;if(injected)select(injected);}sessionChange=callback;return()=>{if(sessionChange===callback)sessionChange=null;};}
function select(provider:WatchedProvider){if(chosen){chosen.removeListener?.("accountsChanged",accountsChanged);chosen.removeListener?.("disconnect",disconnected);}chosen=provider;chosen.on?.("accountsChanged",accountsChanged);chosen.on?.("disconnect",disconnected);return chosen;}
export async function api<T>(url:string,data?:unknown,method="POST"):Promise<T>{const response=await fetch(url,{method,credentials:"same-origin",headers:data===undefined?undefined:{"content-type":"application/json"},body:data===undefined?undefined:JSON.stringify(data),cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error||"Request failed");return body;}
export function mobileWalletEnabled(){return!!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;}
async function provider(mobile=false){
 if(chosen&&!mobile)return chosen;
 const injected=(window as unknown as {ethereum?:WatchedProvider}).ethereum;if(injected&&!mobile)return select(injected);
 const projectId=process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;if(!projectId)throw new Error("Open this page in your wallet’s browser, or configure WalletConnect for mobile wallets.");
 const network=auctionNetwork();if(network.test)throw new Error("Use an injected wallet for local Anvil tests");
 const {EthereumProvider}=await import("@walletconnect/ethereum-provider");const wc=await EthereumProvider.init({projectId,chains:[network.chain.id],showQrModal:true,metadata:{name:"Memory Wars",description:"USDC hardware auctions on Base",url:location.origin,icons:[`${location.origin}/favicon.ico`]}});await wc.connect();return select(wc as unknown as WatchedProvider);
}
async function walletClient(){const network=auctionNetwork();const wallet=createWalletClient({transport:custom(await provider()),chain:network.chain});try{await wallet.switchChain({id:network.chain.id});}catch(e){if(!network.test)throw e;await wallet.addChain({chain:network.chain});await wallet.switchChain({id:network.chain.id});}return wallet;}
export async function signIn(mobile=false){await provider(mobile);const wallet=await walletClient();const [address]=await wallet.requestAddresses();if(!address)throw new Error("Select a wallet account");const {nonceId,message}=await api<{nonceId:string;message:string}>("/api/auth/wallet/nonce",{address});const signature=await wallet.signMessage({account:address,message});return(await api<{me:Me}>("/api/auth/wallet/verify",{nonceId,signature})).me;}
export async function disconnectWallet(){sessionChange=null;const previous=chosen;chosen=null;previous?.removeListener?.("accountsChanged",accountsChanged);previous?.removeListener?.("disconnect",disconnected);await previous?.disconnect?.().catch(()=>{});}
export async function payBid(address:Address,recipient:Address,amount:string){const network=auctionNetwork();const wallet=await walletClient();const [active]=await wallet.requestAddresses();if(!active||active.toLowerCase()!==address.toLowerCase())throw new Error("Switch back to your signed-in wallet before paying");return wallet.writeContract({account:address,address:network.token,abi:erc20Abi,functionName:"transfer",args:[recipient,BigInt(amount)]});}
