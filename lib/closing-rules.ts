export const DAY_MS = 24 * 60 * 60 * 1000;
export type CustomerCounts = { combined: number; parley: number; run: number; dev: number };
export type ExtensionState = { deadline: number; baseline: bigint; volume: bigint; extended: boolean };
export function countBid(input: { now: number; deadline: number; baseline: bigint; volume: bigint; amount: bigint; durationMs?: number }): ExtensionState {
  if (input.now >= input.deadline) return { deadline: input.deadline, baseline: input.baseline, volume: input.volume, extended: false };
  if (input.amount <= 0n || input.volume < 0n || input.baseline <= 0n) throw new Error("Invalid extension accounting");
  const baseline = input.baseline;
  const volume = input.volume + input.amount;
  const target = baseline * 10n;
  if (volume < target) return { deadline: input.deadline, baseline, volume, extended: false };
  // One extension per paid bid. Consume this window's payments once, and
  // promote the reached target—not the last bid—to the next baseline.
  return { deadline: input.deadline + (input.durationMs ?? DAY_MS), baseline: target, volume: 0n, extended: true };
}
