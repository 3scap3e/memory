import test from 'node:test';
import assert from 'node:assert/strict';
import {shippingAddress,shippingUpdate} from '../lib/shipping-rules.ts';
const address={name:'Test Recipient',line1:'123 Test Street',city:'Test City',country:'us',postalCode:'10001'};
test('delivery input requires a usable address and strips unknown fields',()=>{
 const parsed=shippingAddress({...address,userId:'someone-else',trackingNumber:'fake'});
 assert.equal(parsed.country,'US');assert.equal(parsed.line2,'');assert.equal('userId' in parsed,false);assert.equal('trackingNumber' in parsed,false);
 for(const key of ['name','line1','city','country'])assert.throws(()=>shippingAddress({...address,[key]:''}));
 assert.throws(()=>shippingAddress({...address,country:'United States'}));
 assert.throws(()=>shippingAddress({...address,email:'invalid'}));
});
test('shipping status and tracking must be valid',()=>{
 assert.throws(()=>shippingUpdate({status:'shipped'}));
 assert.throws(()=>shippingUpdate({status:'made_up'}));
 assert.throws(()=>shippingUpdate({status:'preparing',note:'x'.repeat(1001)}));
 assert.deepEqual(shippingUpdate({status:'shipped',carrier:' Courier ',trackingNumber:' TEST-123 ',note:'On its way'}),{status:'shipped',carrier:'Courier',trackingNumber:'TEST-123',note:'On its way'});
});
