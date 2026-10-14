import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {PrismaClient} from '@prisma/client';
import {createWalletClient,http,getAddress} from 'viem';
const config=JSON.parse(await readFile('.anvil/session.json','utf8'));
if(!['localhost','127.0.0.1'].includes(new URL(config.rpc).hostname))throw Error('Local Anvil signing only');
const pg=await PGlite.create();
let server,client,child;
try{
 for(const name of (await readdir('prisma/migrations')).filter(n=>/^\d/.test(n)).sort())await pg.exec(await readFile(`prisma/migrations/${name}/migration.sql`,'utf8'));
 server=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:54331});await server.start();
 const url='postgresql://postgres:postgres@127.0.0.1:54331/postgres?sslmode=disable&connection_limit=1';
 client=new PrismaClient({datasources:{db:{url}}});
 const winner=await client.memoryUser.create({data:{walletAddress:getAddress(config.bidders[2])}});
 await client.memoryAuction.create({data:{id:'kingston-64',title:'Kingston',status:'closed'}});
 const bid=await client.memoryBid.create({data:{auctionId:'kingston-64',userId:winner.id,amount:500000000n,status:'accepted',expectedVersion:0,feeCap:0n,expiresAt:new Date(Date.now()+60000),acceptedAt:new Date(),paidOnChainAt:new Date()}});
 await client.memoryAuction.update({where:{id:'kingston-64'},data:{currentBidId:bid.id,winningBidId:bid.id,currentAmount:bid.amount}});
 await client.memoryNonce.count({where:{address:getAddress(config.bidders[2]),createdAt:{gt:new Date(Date.now()-60000)}}});
 await client.$disconnect();
 await pg.exec('DEALLOCATE ALL');
 const origin='http://127.0.0.1:3104';
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3104'],{env:{...process.env,NODE_ENV:'production',APP_URL:origin,DATABASE_URL:url,ANVIL_TEST_MODE:'false',NEXT_PUBLIC_AUCTION_NETWORK:'base',AUCTION_ADMIN_WALLETS:config.treasury},stdio:['ignore','ignore','inherit']});
 for(let i=0;i<60;i++){try{const r=await fetch(`${origin}/api/me`);if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));if(i===59)throw Error('Test server did not start');}
 async function request(path,body,cookie,method=body?'POST':'GET'){
  const r=await fetch(`${origin}${path}`,{method,headers:{origin,...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {response:r,data:await r.json().catch(()=>null)};
 }
 async function login(address){
  const n=await request('/api/auth/wallet/nonce',{address});assert.equal(n.response.status,200);
  const wallet=createWalletClient({account:address,transport:http(config.rpc)});
  const signature=await wallet.signMessage({message:n.data.message});
  const result=await request('/api/auth/wallet/verify',{nonceId:n.data.nonceId,signature});assert.equal(result.response.status,200);
  return result.response.headers.get('set-cookie').split(';')[0];
 }
 const winningCookie=await login(config.bidders[2]),otherCookie=await login(config.bidders[0]);
 const path='/api/auctions/kingston-64/shipping';
 assert.equal((await request(path)).response.status,401);
 assert.equal((await request(path,undefined,otherCookie)).response.status,403);
 const address={name:'Test Recipient',line1:'123 Test Street',line2:'Unit 1',city:'Test City',region:'NY',postalCode:'10001',country:'US',email:'recipient@example.test',phone:'555-0100'};
 assert.equal((await request(path,{address},otherCookie,'PUT')).response.status,403);
 const saved=await request(path,{address},winningCookie,'PUT');assert.equal(saved.response.status,200);assert.equal(saved.data.shipment.address.line1,address.line1);assert.equal(saved.response.headers.get('cache-control'),'private, no-store');
 await pg.query(`UPDATE "MemoryShipment" SET status='shipped', carrier='Test Courier', "trackingNumber"='TEST-TRACK-123', updates=$1 WHERE "auctionId"='kingston-64'`,[JSON.stringify([{date:new Date().toISOString(),status:'shipped',note:'Dispatched'}])]);
 const tracking=await request(path,undefined,winningCookie);assert.equal(tracking.data.shipment.trackingNumber,'TEST-TRACK-123');assert.equal(tracking.data.shipment.updates[0].note,'Dispatched');
 assert.equal((await request(path,{address:{...address,line1:'Changed'}},winningCookie,'PUT')).response.status,409);
 assert.equal((await request(path,undefined,otherCookie)).response.status,403);
 const history=await request('/api/auctions/kingston-64/history');assert.equal(history.response.status,200);assert.deepEqual(Object.keys(history.data.bids[0]).sort(),['amount','date','refund']);
 const admin=await fetch(`${origin}/api/admin/shipments`);assert.equal(admin.status,404);
 console.log('PASSED: winner address submission, private reads, other-wallet denial, tracking display, dispatched-address lock, anonymous public history, and no production owner route.');
}finally{
 if(child){child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});}
 await client?.$disconnect();await server?.stop();await pg.close();
}
