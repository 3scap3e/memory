import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, countBid } from '../lib/closing-rules.ts';
const money = n => BigInt(n) * 1_000_000n;
test('countdown-start bid sets baseline, not the next accepted bid',()=>{
 let s={deadline:DAY_MS,baseline:money(525),volume:0n};
 for(const n of [600,1000,1500])s=countBid({...s,now:1000,amount:money(n)});
 assert.equal(s.baseline,money(525));assert.equal(s.volume,money(3100));assert.equal(s.extended,false);
 s=countBid({...s,now:2000,amount:money(2150)});
 assert.equal(s.extended,true);assert.equal(s.deadline,2*DAY_MS);assert.equal(s.baseline,money(5250));assert.equal(s.volume,0n);
});
test('target reached at 11pm adds a day to the existing 2pm deadline',()=>{
 const start=Date.UTC(2026,9,14,14);const reached=Date.UTC(2026,9,14,23);
 const s=countBid({now:reached,deadline:start+DAY_MS,baseline:money(500),volume:money(4000),amount:money(1000)});
 assert.equal(s.deadline,Date.UTC(2026,9,16,14));
});
test('reached target becomes next baseline, not latest bid or overshoot',()=>{
 let s={deadline:DAY_MS,baseline:money(500),volume:money(4000)};
 s=countBid({...s,now:1000,amount:money(2000)});
 assert.equal(s.baseline,money(5000));assert.equal(s.volume,0n);
 s=countBid({...s,now:2000,amount:money(30000)});
 assert.equal(s.extended,false);
 s=countBid({...s,now:3000,amount:money(20000)});
 assert.equal(s.baseline,money(50000));assert.equal(s.deadline,3*DAY_MS);assert.equal(s.volume,0n);
});
test('expired bids cannot restart the clock',()=>{
 const s=countBid({now:DAY_MS,deadline:DAY_MS,baseline:money(500),volume:money(4000),amount:money(1000)});
 assert.equal(s.extended,false);assert.equal(s.deadline,DAY_MS);
});
test('one paid bid cannot trigger multiple extensions',()=>{
 const s=countBid({now:1000,deadline:DAY_MS,baseline:money(500),volume:money(4000),amount:money(100000)});
 assert.equal(s.baseline,money(5000));assert.equal(s.deadline,2*DAY_MS);assert.equal(s.volume,0n);
});
