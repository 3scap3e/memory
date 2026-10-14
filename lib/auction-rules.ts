export const BASE_CHAIN_ID = 8453;
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const USDC_DECIMALS = 6;
export const MIN_INCREMENT = 25_000_000n;
export const MAX_REFUND_FEE = 50_000n; // 0.05 USDC; deducted only from rewards.
export const AUCTION_ITEMS = [
  { id: "kingston-64", title: "64GB KINGSTON FURY BEAST", startingAmount: 225_000_000n },
  { id: "corsair-128", title: "128GB CORSAIR DOMINATOR", startingAmount: 375_000_000n },
  { id: "suprim-4090", title: "MSI RTX 4090 SUPRIM LIQUID X", startingAmount: 1_025_000_000n },
] as const;

export function parseAmount(value: unknown): bigint {
  if (typeof value !== "string" || !/^\d{1,8}(\.\d{1,6})?$/.test(value)) throw new Error("Enter a USDC amount with at most six decimal places");
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (amount <= 0n) throw new Error("Enter a positive bid");
  return amount;
}
export function formatAmount(amount: bigint | string): string {
  const n = BigInt(amount);
  return `${n / 1_000_000n}.${(n % 1_000_000n).toString().padStart(6, "0")}`.replace(/\.?0+$/, "");
}
export function settlement(previous: bigint, next: bigint, fee: bigint) {
  if (previous < 0n || next <= 0n) throw new Error("Enter a positive bid");
  if (previous > 0n && next - previous < MIN_INCREMENT) throw new Error("Increase the bid by at least 25 USDC");
  if (fee < 0n || fee > MAX_REFUND_FEE) throw new Error("Outgoing fee exceeds the 0.05 USDC cap");
  if (previous === 0n) return { principal: 0n, grossReward: 0n, netReward: 0n, fee: 0n, payout: 0n, retained: next };
  const grossReward = (next - previous) / 3n;
  if (fee > grossReward) throw new Error("The fee cannot reduce the original bid");
  return { principal: previous, grossReward, netReward: grossReward - fee, fee, payout: previous + grossReward - fee, retained: next - previous - grossReward };
}

export function minimumBid(current: bigint, opening: bigint): bigint { return current > 0n ? current + MIN_INCREMENT : opening; }
