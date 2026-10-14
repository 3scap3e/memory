import test from 'node:test';
import assert from 'node:assert/strict';
import {bidState,receivedTotals} from '../lib/activity-rules.ts';
test('wallet history distinguishes leading, outbid, and won bids',()=>{
 const bid={id:'a',status:'accepted'};
 assert.equal(bidState(bid,{status:'open',currentBidId:'a',winningBidId:null}),'current');
 assert.equal(bidState(bid,{status:'open',currentBidId:'b',winningBidId:null}),'outbid');
 assert.equal(bidState(bid,{status:'closed',currentBidId:'a',winningBidId:'a'}),'won');
 assert.equal(bidState({...bid,status:'quoted'},{status:'open',currentBidId:null,winningBidId:null}),'payment_pending');
});
test('received rewards exclude unpaid returns and deduct only the recorded fee',()=>{
 const result=receivedTotals([{status:'paid',amount:234990000n,reward:10000000n,fee:10000n},{status:'pending',amount:274990000n,reward:20000000n,fee:10000n}]);
 assert.deepEqual(result,{returned:234990000n,rewards:9990000n,pending:274990000n});
});
