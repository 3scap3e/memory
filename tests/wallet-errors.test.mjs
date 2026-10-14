import test from 'node:test';
import assert from 'node:assert/strict';
import {walletErrorCode,walletErrorMessage} from '../lib/wallet-errors.ts';
test('wallet rejection and pending prompts have plain messages',()=>{
 assert.equal(walletErrorMessage({cause:{code:4001}}),'Request cancelled in your wallet.');
 assert.equal(walletErrorMessage({code:-32002}),'Open your wallet to finish the pending request.');
});
test('currency mismatch and RPC details never reach connect UI',()=>{
 const error=new Error('Invalid parameters were provided to the RPC method. Details: nativeCurrency.symbol does not match currency symbol for a network the user already has added with the same chainId. Received: ETH Version: viem@2.57.5');
 assert.equal(walletErrorMessage(error),'Select the auction network in your wallet, then reconnect.');
 assert.equal(walletErrorMessage(new Error('RPC failed. Version: viem@2.57.5')),'Couldn’t connect. Please try again.');
});
test('unknown network code is distinguished from a rejected switch',()=>{
 assert.equal(walletErrorCode({cause:{code:4902}}),4902);
 assert.equal(walletErrorCode({code:4001}),4001);
 const cyclic={};cyclic.cause=cyclic;assert.equal(walletErrorCode(cyclic),undefined);
});
