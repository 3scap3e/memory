export function walletErrorCode(error: unknown): number | undefined {
  const visited = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const value = current as { code?: unknown; cause?: unknown };
    if (typeof value.code === "number") return value.code;
    current = value.cause;
  }
}

export function walletErrorMessage(error: unknown, fallback = "Couldn’t connect. Please try again."): string {
  const code = walletErrorCode(error);
  if (code === 4001) return "Request cancelled in your wallet.";
  if (code === -32002) return "Open your wallet to finish the pending request.";
  if (code === 4900 || code === 4901) return "Your wallet is disconnected. Please reconnect.";
  const message = error instanceof Error ? error.message : "";
  if (/nativeCurrency|currency symbol|chainId|chain mismatch/i.test(message)) return "Select the auction network in your wallet, then reconnect.";
  if (/RPC|viem|Version:|Details:|parameters|execution reverted|insufficient funds/i.test(message)) return fallback;
  return message || fallback;
}
