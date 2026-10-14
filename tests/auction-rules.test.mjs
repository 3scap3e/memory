import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, formatAmount, settlement, MAX_REFUND_FEE } from '../lib/auction-rules.ts';
const usdc = n => BigInt(n) * 1_000_000n;
test('50 → 80 → 140 leaves 110 for Stagerunner, with gas outside its allocation', () => {
  let pool = usdc(50);
  const b = settlement(usdc(50), usdc(80), 10_000n);
  assert.equal(b.payout, 59_990_000n);
  assert.equal(b.netReward, 9_990_000n);
  assert.equal(b.fee, 10_000n);
  pool += b.retained;
  assert.equal(pool, usdc(70));
  const c = settlement(usdc(80), usdc(140), 20_000n);
  assert.equal(c.payout, 99_980_000n);
  pool += c.retained;
  assert.equal(pool, usdc(110));
  assert.equal(usdc(270), b.payout + c.payout + b.fee + c.fee + pool);
});
test('100 → 130 pays 110 minus outgoing gas', () => {
  const s = settlement(usdc(100), usdc(130), 15_000n);
  assert.equal(s.payout, 109_985_000n);
  assert.equal(s.retained, usdc(20));
});
test('first-bid settlement has no refund or fee', () => {
  for (const amount of [1n, 100_000n, usdc(1), usdc(25), usdc(100)]) {
    assert.deepEqual(settlement(0n, amount, 0n), { principal: 0n, grossReward: 0n, netReward: 0n, fee: 0n, payout: 0n, retained: amount });
  }
  assert.throws(() => settlement(0n, 0n, 0n));
  assert.throws(() => settlement(0n, -1n, 0n));
});
test('after a tiny opening bid, the full 25 USDC increment still applies', () => {
  assert.throws(() => settlement(1n, 25_000_000n, 0n));
  assert.equal(settlement(1n, 25_000_001n, 0n).grossReward, 8_333_333n);
});
test('rejects underbids and fee-policy violations', () => {
  assert.throws(() => settlement(usdc(50), usdc(74), 0n));
  assert.throws(() => settlement(usdc(50), usdc(75), MAX_REFUND_FEE + 1n));
  assert.throws(() => settlement(usdc(50), usdc(75), -1n));
});
test('USDC parsing never rounds a bid with floating-point arithmetic', () => {
  assert.equal(parseAmount('25.000001'), 25_000_001n);
  assert.equal(formatAmount(25_000_001n), '25.000001');
  assert.equal(formatAmount(usdc(100)), '100');
  for (const v of ['-25','1e6','25.0000001','Infinity',25,'0']) assert.throws(() => parseAmount(v));
});
test('rounding favors the pool by at most one micro-USDC per reward', () => {
  const s = settlement(usdc(50), usdc(75), 1000n);
  assert.equal(s.grossReward, 8_333_333n);
  assert.equal(s.retained, 16_666_667n);
  assert.equal(s.payout + s.fee + s.retained, usdc(75));
});
test('multiple increments preserve principal, balance, and the two-thirds floor', () => {
  let last = usdc(25), pool = last, refunded = 0n, fees = 0n, deposits = last;
  for (const increment of [25,30,60,101,250,25,37,99]) {
    const next = last + usdc(increment);
    const s = settlement(last, next, MAX_REFUND_FEE);
    assert.ok(s.payout >= last);
    pool += s.retained; refunded += s.payout; fees += s.fee; deposits += next;
    assert.equal(deposits, refunded + fees + pool);
    assert.ok(pool * 3n >= next * 2n);
    last = next;
  }
});

test('specified starting minimums apply before the first bid, then the 25 increment applies', async()=>{
 const { AUCTION_ITEMS, minimumBid } = await import('../lib/auction-rules.ts');
 assert.deepEqual(AUCTION_ITEMS.map(i=>minimumBid(0n,i.startingAmount)),[225000000n,375000000n,1025000000n]);
 assert.equal(minimumBid(250000000n,225000000n),275000000n);
});
