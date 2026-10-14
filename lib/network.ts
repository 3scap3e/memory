import { defineChain, isAddress, type Address } from "viem";
import { base } from "viem/chains";
import { USDC_ADDRESS } from "./auction-rules.ts";
export function isAnvil() { return process.env.NEXT_PUBLIC_AUCTION_NETWORK === "anvil"; }
export function localUrl(value: string) { try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname); } catch { return false; } }
export function auctionNetwork() {
  const mode = process.env.NEXT_PUBLIC_AUCTION_NETWORK;
  if (mode && mode !== "base" && mode !== "anvil") throw new Error("Unknown auction network");
  if (!isAnvil()) return { chain: base, token: USDC_ADDRESS, rpcUrl: "https://mainnet.base.org", label: "USDC ON BASE", confirmations: 12, test: false };
  const rpcUrl = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545";
  if (!localUrl(rpcUrl)) throw new Error("Anvil requires a loopback RPC URL");
  const token = process.env.NEXT_PUBLIC_ANVIL_USDC_ADDRESS;
  if (!token || !isAddress(token)) throw new Error("Run the Anvil setup to deploy mock USDC first");
  return { chain: defineChain({ id: 31337, name: "Memory Anvil", nativeCurrency: { name: "Test Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } }), token: token as Address, rpcUrl, label: "MOCK USDC · ANVIL TEST", confirmations: 1, test: true };
}
export function transactionUrl(hash: string) { return isAnvil() ? null : `https://basescan.org/tx/${hash}`; }
