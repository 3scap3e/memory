import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminWallet, assertManualAction } from '../lib/admin-rules.ts';
const address='0x1111111111111111111111111111111111111111';
test('owner access is opt-in and cannot be gained by ordinary wallet login',()=>{
 assert.equal(isAdminWallet(address,undefined),false);
 assert.equal(isAdminWallet(address,address),true);
 assert.equal(isAdminWallet('0x2222222222222222222222222222222222222222',address),false);
 assert.equal(isAdminWallet(address,'not-an-address'),false);
});
test('owner can start without encoded price/customer/bidder targets',()=>{
 assert.doesNotThrow(()=>assertManualAction({action:'start_countdown',status:'open',currentBidId:'paid-bid',endsAt:null,pendingUntil:null,unpaidRefunds:0,now:new Date()}));
});
test('manual close requires an accepted bid and settled payments',()=>{
 const input={action:'close',status:'open',currentBidId:'paid-bid',endsAt:null,pendingUntil:null,unpaidRefunds:0,now:new Date()};
 assert.doesNotThrow(()=>assertManualAction(input));
 assert.throws(()=>assertManualAction({...input,currentBidId:null}));
 assert.throws(()=>assertManualAction({...input,unpaidRefunds:1}));
 assert.throws(()=>assertManualAction({...input,pendingUntil:new Date(Date.now()+10000)}));
 assert.throws(()=>assertManualAction({...input,status:'closed'}));
});
test('starting again cannot reset an active countdown',()=>{
 assert.throws(()=>assertManualAction({action:'start_countdown',status:'open',currentBidId:'paid-bid',endsAt:new Date(Date.now()+10000),pendingUntil:null,unpaidRefunds:0,now:new Date()}));
});
