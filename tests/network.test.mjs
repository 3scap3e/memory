import test from 'node:test';
import assert from 'node:assert/strict';
import {auctionNetwork,localUrl} from '../lib/network.ts';
test('test mode refuses remote RPC URLs and does not fall back to mainnet USDC',()=>{
 const old={mode:process.env.NEXT_PUBLIC_AUCTION_NETWORK,rpc:process.env.NEXT_PUBLIC_ANVIL_RPC_URL,token:process.env.NEXT_PUBLIC_ANVIL_USDC_ADDRESS};
 try{
  process.env.NEXT_PUBLIC_AUCTION_NETWORK='anvil';process.env.NEXT_PUBLIC_ANVIL_RPC_URL='https://mainnet.base.org';assert.throws(()=>auctionNetwork());
  process.env.NEXT_PUBLIC_ANVIL_RPC_URL='http://127.0.0.1:8545';delete process.env.NEXT_PUBLIC_ANVIL_USDC_ADDRESS;assert.throws(()=>auctionNetwork());
  process.env.NEXT_PUBLIC_ANVIL_USDC_ADDRESS='0x1111111111111111111111111111111111111111';assert.equal(auctionNetwork().chain.id,31337);
  process.env.NEXT_PUBLIC_AUCTION_NETWORK='base';assert.equal(auctionNetwork().chain.id,8453);assert.equal(auctionNetwork().confirmations,12);
 }finally{for(const[key,value]of Object.entries({NEXT_PUBLIC_AUCTION_NETWORK:old.mode,NEXT_PUBLIC_ANVIL_RPC_URL:old.rpc,NEXT_PUBLIC_ANVIL_USDC_ADDRESS:old.token})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
 assert.equal(localUrl('https://remote.example'),false);assert.equal(localUrl('http://localhost:8545'),true);
});
