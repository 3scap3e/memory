import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, countBid } from '../lib/closing-rules.ts';
const money = n => BigInt(n) * 1_000_000n;
test('150 first bid sets a 1500 target; 150+200+300+350 does not extend', () => {
 let s={deadline:DAY_MS,baseline:0n,volume:0n};
 for(const n of [150,200,300,350]) s=countBid({...s,now:1000,amount:money(n)});
 assert.equal(s.baseline,money(150)); assert.equal(s.volume,money(1000)); assert.equal(s.deadline,DAY_MS);
 s=countBid({...s,now:2000,amount:money(500)});
 assert.equal(s.extended,true); assert.equal(s.deadline,2*DAY_MS); assert.equal(s.baseline,money(1500)); assert.equal(s.volume,0n);
});
test('the next baseline is 1500, not the latest bid; next target is 15000', () => {
 let s={deadline:2*DAY_MS,baseline:money(1500),volume:0n};
 for(const n of [1000,2000,3000,4000]) s=countBid({...s,now:DAY_MS,amount:money(n)});
 assert.equal(s.extended,false); assert.equal(s.volume,money(10000));
 s=countBid({...s,now:DAY_MS+1,amount:money(5000)});
 assert.equal(s.deadline,3*DAY_MS); assert.equal(s.baseline,money(15000)); assert.equal(s.volume,0n);
});
test('adds a day to the deadline rather than resetting to 24 hours from now', () => {
 const s=countBid({now:1000,deadline:DAY_MS,baseline:money(150),volume:money(1000),amount:money(500)});
 assert.equal(s.deadline,2*DAY_MS);
});
test('expired bids cannot extend the clock', () => {
 const s=countBid({now:DAY_MS,deadline:DAY_MS,baseline:money(150),volume:money(1000),amount:money(500)});
 assert.equal(s.extended,false); assert.equal(s.deadline,DAY_MS); assert.equal(s.volume,money(1000));
});
test('overshoot is consumed once and cannot earn two days from one payment', () => {
 const s=countBid({now:1000,deadline:DAY_MS,baseline:money(150),volume:money(1000),amount:money(20000)});
 assert.equal(s.deadline,2*DAY_MS); assert.equal(s.baseline,money(1500)); assert.equal(s.volume,0n);
});
