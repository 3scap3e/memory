import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeEventTopics, encodeAbiParameters, erc20Abi } from 'viem';
import { USDC_ADDRESS } from '../lib/auction-rules.ts';
import { matchesUsdcPayment } from '../lib/payment-rules.ts';
const payer='0x1111111111111111111111111111111111111111';
const treasury='0x2222222222222222222222222222222222222222';
const other='0x3333333333333333333333333333333333333333';
const amount=50000000n;
function transfer(from=payer,to=treasury,value=amount,token=USDC_ADDRESS){return {address:token,topics:encodeEventTopics({abi:erc20Abi,eventName:'Transfer',args:{from,to}}),data:encodeAbiParameters([{type:'uint256'}],[value]),blockNumber:1n,blockHash:'0x'+'1'.repeat(64),transactionHash:'0x'+'2'.repeat(64),transactionIndex:0,logIndex:0,removed:false};}
test('only an exact native-USDC transfer from the signed-in wallet funds a bid',()=>{
 assert.equal(matchesUsdcPayment([transfer()],payer,treasury,amount),true);
 assert.equal(matchesUsdcPayment([transfer(other)],payer,treasury,amount),false);
 assert.equal(matchesUsdcPayment([transfer(payer,other)],payer,treasury,amount),false);
 assert.equal(matchesUsdcPayment([transfer(payer,treasury,amount-1n)],payer,treasury,amount),false);
 assert.equal(matchesUsdcPayment([transfer(payer,treasury,amount,other)],payer,treasury,amount),false);
 assert.equal(matchesUsdcPayment([],payer,treasury,amount),false);
});
test('ambiguous repeated transfers in a single transaction are not accepted',()=>{
 assert.equal(matchesUsdcPayment([transfer(),transfer()],payer,treasury,amount),false);
});
