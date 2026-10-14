import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { CUSTOMER_PAYMENTS_SQL, countCustomers } from '../lib/customer-rules.ts';

test('additive migration and payment constraints work in PostgreSQL', async t => {
 const pg = new PGlite();
 try {
  await pg.exec(`CREATE TABLE "User" (id text primary key, email text); INSERT INTO "User" VALUES ('existing-user', 'existing@example.test');`);
  await pg.exec(await readFile(new URL('../prisma/migrations/20261013000000_memory_auctions/migration.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../prisma/migrations/20261013010000_positive_opening_bid/migration.sql',import.meta.url),'utf8'));
  await t.test('existing users and shared purchase tables are not changed', async () => {
   assert.equal((await pg.query('SELECT email FROM "User"')).rows[0].email,'existing@example.test');
  });
  await pg.exec(`INSERT INTO "MemoryUser" (id,"walletAddress") VALUES ('a','0x1111111111111111111111111111111111111111');
   INSERT INTO "MemoryAuction" (id,title,"updatedAt") VALUES ('kingston-64','Kingston',now()),('corsair-128','Corsair',now()),('suprim-4090','Suprim',now());
   INSERT INTO "MemoryBid" (id,"auctionId","userId",amount,"expectedVersion","feeCap","expiresAt","paymentHash") VALUES ('bid-a','kingston-64','a',50000000,0,10000,now()+interval '10 minutes','tx-a');`);
  await t.test('opening minimum defaults to one micro-USDC', async () => {
   assert.equal(String((await pg.query(`SELECT "openingAmount" FROM "MemoryAuction" WHERE id='kingston-64'`)).rows[0].openingAmount),'1');
  });
  await pg.exec(await readFile(new URL('../prisma/migrations/20261014000000_manual_auctions/migration.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../prisma/migrations/20261014010000_manual_refund_tracking/migration.sql',import.meta.url),'utf8'));
  await t.test('manual migration sets per-item opening prices without changing shared users', async () => {
   const prices=await pg.query(`SELECT id, "openingAmount" FROM "MemoryAuction" ORDER BY id`);
   assert.deepEqual(prices.rows.map(r=>[r.id,String(r.openingAmount)]),[['corsair-128','375000000'],['kingston-64','225000000'],['suprim-4090','1025000000']]);
   assert.equal((await pg.query('SELECT count(*) FROM "User"')).rows[0].count,1);
  });
  await t.test('one blockchain payment cannot fund two bids', async () => {
   await assert.rejects(pg.query(`INSERT INTO "MemoryBid" (id,"auctionId","userId",amount,"expectedVersion","feeCap","expiresAt","paymentHash") VALUES ('bid-b','corsair-128','a',50000000,0,10000,now()+interval '10 minutes','tx-a')`), e=>e.code==='23505');
  });
  await t.test('one incoming bid cannot create a refund twice', async () => {
   const sql=`INSERT INTO "MemoryPayout" (id,"triggeringBidId","auctionId",recipient,principal,reward,fee,amount,reason) VALUES ($1,'bid-a','kingston-64','0x1111111111111111111111111111111111111111',50000000,10000000,10000,59990000,'outbid')`;
   await pg.query(sql,['payout-a']); await assert.rejects(pg.query(sql,['payout-b']),e=>e.code==='23505');
  });
  await t.test('failed settlement rolls back the auction and bid together', async () => {
   await assert.rejects(pg.transaction(async tx=>{
    await tx.query(`UPDATE "MemoryAuction" SET "currentAmount"=80000000 WHERE id='kingston-64'`);
    await tx.query(`UPDATE "MemoryBid" SET status='accepted' WHERE id='bid-a'`);
    throw new Error('simulated failure');
   }));
   assert.equal(String((await pg.query(`SELECT "currentAmount" FROM "MemoryAuction" WHERE id='kingston-64'`)).rows[0].currentAmount),'0');
   assert.equal((await pg.query(`SELECT status FROM "MemoryBid" WHERE id='bid-a'`)).rows[0].status,'quoted');
  });
  await t.test('customer counts include paid receipts, deduplicate customers, and exclude drafts/refunds',async()=>{
   await pg.exec(`CREATE TABLE "StageSubmission" (id text primary key,product text);
    CREATE TABLE "StageCheckout" (id text primary key,"requesterId" text,"submissionId" text,status text,"amountCents" int,"providerPaymentId" text,"transactionHash" text);
    INSERT INTO "StageSubmission" VALUES ('parley','PARLEY'),('run','RUN'),('dev','DEV');
    INSERT INTO "StageCheckout" VALUES
     ('1','customer-a','parley','PAID',100,'pi_1',null),
     ('2','customer-a','parley','PAID',100,'pi_2',null),
     ('3','customer-a','run','paid',100,null,'hash_3'),
     ('4','customer-b','dev','PAID',100,'pi_4',null),
     ('5','unpaid','run','AWAITING_CONFIGURATION',100,null,null),
     ('6','unverified','run','PAID',100,null,null),
     ('7','refunded','dev','REFUNDED',100,'pi_7',null),
     ('8','free','dev','PAID',0,'pi_8',null);`);
   const result=await pg.query(CUSTOMER_PAYMENTS_SQL);
   assert.deepEqual(countCustomers(result.rows),{combined:2,parley:1,run:1,dev:1});
  });
 } finally { await pg.close(); }
});
