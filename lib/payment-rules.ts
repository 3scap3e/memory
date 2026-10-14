import { erc20Abi, parseEventLogs, type Address, type Log } from "viem";
import { USDC_ADDRESS } from "./auction-rules.ts";
export function matchesUsdcPayment(logs: Log[], payer: Address, recipient: Address, amount: bigint, token: Address = USDC_ADDRESS) {
  const matches = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs }).filter(log => log.address.toLowerCase() === token.toLowerCase() && log.args.from.toLowerCase() === payer.toLowerCase() && log.args.to.toLowerCase() === recipient.toLowerCase() && log.args.value === amount);
  return matches.length === 1;
}
