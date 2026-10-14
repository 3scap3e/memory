import "server-only";
import { createPublicClient, getAddress, http, isAddress, parseAbi, type Address, type Hash, } from "viem";
import { publicActionsL2 } from "viem/op-stack";
import { matchesUsdcPayment } from "../payment-rules";
import { auctionNetwork, isAnvil, localUrl } from "../network";
import { MAX_REFUND_FEE } from "../auction-rules";
import { env, HttpError, requireEnv } from "./http";
let client: ReturnType<typeof makeClient> | undefined;
function makeClient() { const network = auctionNetwork(); return createPublicClient({ chain: network.chain, transport: http(network.test ? network.rpcUrl : env("BASE_RPC_URL") || network.rpcUrl, { timeout: 12_000, retryCount: 1 }) }).extend(publicActionsL2()); }
export function chain() { return client ??= makeClient(); }
export function treasury() {
  const raw = requireEnv("BASE_TREASURY_ADDRESS");
  if (!isAddress(raw) || raw.toLowerCase() === auctionNetwork().token.toLowerCase()) throw new HttpError(503, "Configure a valid auction treasury wallet");
  return getAddress(raw);
}
export function ready() {
  return !!env("DATABASE_URL") && !!env("BASE_TREASURY_ADDRESS") && env("AUCTIONS_ENABLED") === "true" && (!isAnvil() || (env("ANVIL_TEST_MODE") === "true" && localUrl(env("APP_URL") || "")));
}
export async function requirePayments() {
  if (!ready()) throw new HttpError(503, "Auctions are being prepared. No payment has been requested.");
  await requireNetwork();
}
export async function requireNetwork(){
  treasury();
  if (await chain().getChainId() !== auctionNetwork().chain.id) throw new HttpError(503, "The RPC is connected to the wrong auction network");
}
export async function clockNow() { return isAnvil() ? new Date(Number((await chain().getBlock()).timestamp) * 1000) : new Date(); }
export function countdownMs() {
  if (!isAnvil()) return 86400_000;
  const seconds = Number(env("ANVIL_COUNTDOWN_SECONDS") || "86400");
  if (!Number.isInteger(seconds) || seconds < 10 || seconds > 86400) throw new HttpError(503, "Invalid Anvil countdown duration");
  return seconds * 1000;
}
export const confirmationGraceMs = () => isAnvil() ? 2000 : 120000;
export const finalQuotePauseMs = () => isAnvil() ? 2000 : 90000;
export const quoteDeadlineBufferMs = () => isAnvil() ? 1000 : 60000;
const oracleAbi = parseAbi(["function getL1FeeUpperBound(uint256) view returns (uint256)"]);
const ceil = (a: bigint, b: bigint) => (a + b - 1n) / b;
export async function ethPriceMicros() {
  const response = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new HttpError(503, "Could not estimate the outgoing fee. Try again shortly.");
  const body = await response.json() as { data?: { amount?: string } };
  const value = body.data?.amount;
  if (!value || !/^\d+(\.\d+)?$/.test(value)) throw new HttpError(503, "Fee price unavailable");
  const [whole, fraction = ""] = value.split(".");
  const price = BigInt(whole) * 1_000_000n + BigInt(fraction.slice(0, 6).padEnd(6, "0"));
  if (price <= 0n) throw new HttpError(503, "Fee price unavailable");
  return price;
}
export async function estimateFee() {
  if (isAnvil()) return 10_000n; // Deterministic 0.01 mock-USDC test fee.
  const [fees, l1, price] = await Promise.all([
    chain().estimateFeesPerGas(),
    chain().readContract({ address: "0x420000000000000000000000000000000000000F", abi: oracleAbi, functionName: "getL1FeeUpperBound", args: [400n] }),
    ethPriceMicros(),
  ]);
  // Budget 150k execution gas, full L1 data fees and a 2× buffer.
  // A fresh contract simulation is required again before any payout is signed.
  const wei = 150_000n * fees.maxFeePerGas + l1;
  const charge = ceil(wei * price * 2n, 10n ** 18n) + 1000n;
  if (charge > MAX_REFUND_FEE) throw new HttpError(503, "Outgoing gas exceeds the 0.05 USDC limit. Bidding is paused until fees fall.");
  return charge;
}
export async function verifyPayment(hash: Hash, payer: Address, amount: bigint, createdAt: Date) {
  const receipt = await chain().getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt) return { state: "not_found" as const, paidAt: null };
  if (receipt.status !== "success") throw new HttpError(400, "Your transaction reverted. The bid was not accepted.");
  const block = await chain().getBlock({ blockNumber: receipt.blockNumber });
  if (Number(block.timestamp) * 1000 < createdAt.getTime() - 30_000) throw new HttpError(400, "This payment predates your bid quote");
  // The token's Transfer sender identifies the paying wallet. A smart wallet's
  // top-level transaction can be sent by a bundler rather than the wallet itself.
  if (!matchesUsdcPayment(receipt.logs, payer, treasury(), amount, auctionNetwork().token)) throw new HttpError(400, "No matching USDC payment from your wallet to the auction treasury");
  const confirmed = (await chain().getBlockNumber({cacheTime:0})) - receipt.blockNumber + 1n >= BigInt(auctionNetwork().confirmations);
  return { state: confirmed ? "confirmed" as const : "confirming" as const, paidAt: new Date(Number(block.timestamp) * 1000) };
}
export async function verifyRefund(hash: Hash, recipient: Address, amount: bigint, createdAt: Date) {
  const receipt = await chain().getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt) return { confirmed: false, matched: false, gasCost: null };
  if (receipt.status !== "success") throw new HttpError(400, "The refund transaction reverted");
  const block = await chain().getBlock({ blockNumber: receipt.blockNumber });
  if (Number(block.timestamp) * 1000 < createdAt.getTime() - 30_000) throw new HttpError(400, "This transfer predates the refund obligation");
  if (!matchesUsdcPayment(receipt.logs, treasury(), recipient, amount, auctionNetwork().token)) throw new HttpError(400, "The transaction does not send the exact refund from the treasury to this recipient");
  return { matched: true, confirmed: (await chain().getBlockNumber({cacheTime:0})) - receipt.blockNumber + 1n >= BigInt(auctionNetwork().confirmations), gasCost: (receipt.gasUsed * receipt.effectiveGasPrice + ("l1Fee" in receipt ? receipt.l1Fee ?? 0n : 0n)).toString() };
}
