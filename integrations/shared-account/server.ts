import "server-only";
import type { Prisma } from "@prisma/client";
type Database = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
export type Identity = { sharedId?: string; wallet: string | null };
async function exists(db: Database, table: string) {
  const rows=await db.$queryRaw<{ present: boolean }[]>`SELECT to_regclass(${`"${table}"`}) IS NOT NULL AS present`;
  return rows[0]?.present ?? false;
}
export async function resolve(db: Database, identity: Identity) {
  let shared: { id: string; email: string | null; walletAddress: string | null } | null=null;
  if (await exists(db,"User")) {
    const users=identity.sharedId
      ? await db.$queryRaw<{ id:string; email:string|null; walletAddress:string|null }[]>`SELECT "id","email","walletAddress" FROM "User" WHERE "id"=${identity.sharedId}`
      : identity.wallet ? await db.$queryRaw<{ id:string; email:string|null; walletAddress:string|null }[]>`SELECT "id","email","walletAddress" FROM "User" WHERE lower("walletAddress")=lower(${identity.wallet})` : [];
    shared=users[0]??null;
  }
  const wallet=identity.wallet??shared?.walletAddress??null;
  const memories=wallet && await exists(db,"MemoryUser")
    ? await db.$queryRaw<{ id:string; walletAddress:string }[]>`SELECT "id","walletAddress" FROM "MemoryUser" WHERE lower("walletAddress")=lower(${wallet})` : [];
  return {shared,memory:memories[0]??null,wallet};
}
export async function activity(db: Database, identity: Identity) {
  const account=await resolve(db,identity);
  let submissions: unknown[]=[],bookings: unknown[]=[],bookingPayments: unknown[]=[],bids: unknown[]=[];
  if(account.shared) {
    const id=account.shared.id;
    if(await exists(db,"StageSubmission") && await exists(db,"StageCheckout")) submissions=await db.$queryRaw<unknown[]>`SELECT s."id",s."product",s."description",s."input",s."status",s."createdAt",
      COALESCE((SELECT json_agg(json_build_object('id',c."id",'rail',c."rail",'mode',c."mode",'tierKey',c."tierKey",'amountCents',c."amountCents",'currency',c."currency",'status',c."status",'createdAt',c."createdAt") ORDER BY c."createdAt" DESC) FROM "StageCheckout" c WHERE c."submissionId"=s."id" AND c."requesterId"=${id}),'[]'::json) AS checkouts
      FROM "StageSubmission" s WHERE s."requesterId"=${id} ORDER BY s."createdAt" DESC LIMIT 50`;
    if(await exists(db,"Ask")) bookings=await db.$queryRaw<unknown[]>`SELECT "id","sentenceText","status","offeredAmountCents","agreedAmountCents","createdAt","links" FROM "Ask" WHERE "requesterId"=${id} ORDER BY "createdAt" DESC LIMIT 50`;
    if(await exists(db,"Checkout")) bookingPayments=await db.$queryRaw<unknown[]>`SELECT "id","amountCents","rail","status","createdAt" FROM "Checkout" WHERE "requesterId"=${id} ORDER BY "createdAt" DESC LIMIT 50`;
  }
  if(account.memory) bids=await db.$queryRaw<unknown[]>`SELECT b."id",a."title",b."amount"::text AS amount,b."status",b."createdAt",a."status" AS "auctionStatus",(a."currentBidId"=b."id") IS TRUE AS current,(a."pendingBidId"=b."id") IS TRUE AS pending FROM "MemoryBid" b JOIN "MemoryAuction" a ON a."id"=b."auctionId" WHERE b."userId"=${account.memory.id} ORDER BY b."createdAt" DESC LIMIT 50`;
  return {activity:submissions,bookings,bookingPayments,memory:{linked:Boolean(account.memory),bids}};
}
export async function eligibility(db: Database, identity: Identity) {
  const account=await resolve(db,identity);const reasons:string[]=[];
  if(account.shared){
    const id=account.shared.id;
    if(await exists(db,"Ask")) {
      const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "Ask" WHERE "requesterId"=${id} AND lower("status") NOT IN ('draft','cancelled','canceled','declined','expired','closed','completed')`;
      if(Number(rows[0]?.count??0))reasons.push('Resolve active Devrel bookings before deleting your account.');
    }
    if(await exists(db,"Checkout")) {
      const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "Checkout" WHERE "requesterId"=${id} AND lower("status") NOT IN ('draft','cancelled','canceled','expired','failed','paid','completed','replaced')`;
      if(Number(rows[0]?.count??0))reasons.push('Resolve pending Devrel payments first.');
    }
    if(await exists(db,"StageCheckout")) {
      const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "StageCheckout" WHERE "requesterId"=${id} AND (lower("status") NOT IN ('cancelled','canceled','expired','failed','awaiting_configuration','paid','completed') OR (lower("mode")='subscription' AND lower("status") NOT IN ('cancelled','canceled','expired','failed','awaiting_configuration')))`;
      if(Number(rows[0]?.count??0))reasons.push('Cancel recurring subscriptions and resolve pending Parley payments first.');
    }
  }
  if(account.memory){
    const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "MemoryBid" b LEFT JOIN "MemoryPayout" p ON p."triggeringBidId"=b."id" JOIN "MemoryAuction" a ON a."id"=b."auctionId" WHERE b."userId"=${account.memory.id} AND (b."paymentHash" IS NOT NULL OR b."submittedHash" IS NOT NULL OR p."id" IS NOT NULL OR a."currentBidId"=b."id" OR a."pendingBidId"=b."id")`;
    if(Number(rows[0]?.count??0))reasons.push('Resolve Memory bids and payment/refund records on Memory. Paid auction records cannot be removed by this action.');
  }
  return {account,reasons,allowed:reasons.length===0,memoryLinked:Boolean(account.memory)};
}
export async function removeAccount(db: Database, identity: Identity) {
  const account=await resolve(db,identity);
  if(account.shared) await db.$queryRaw<unknown[]>`SELECT "id" FROM "User" WHERE "id"=${account.shared.id} FOR UPDATE`;
  if(account.memory) await db.$queryRaw<unknown[]>`SELECT "id" FROM "MemoryUser" WHERE "id"=${account.memory.id} FOR UPDATE`;
  const result=await eligibility(db,identity);
  if(!result.allowed)return result;
  if(account.memory){
    await db.$executeRaw`DELETE FROM "MemoryBid" WHERE "userId"=${account.memory.id}`;
    await db.$executeRaw`DELETE FROM "MemorySession" WHERE "userId"=${account.memory.id}`;
    await db.$executeRaw`DELETE FROM "MemoryNonce" WHERE lower("address")=lower(${account.memory.walletAddress})`;
    await db.$executeRaw`DELETE FROM "MemoryUser" WHERE "id"=${account.memory.id}`;
  }
  if(account.shared){
    if(account.shared.email && await exists(db,"LoginCode"))await db.$executeRaw`DELETE FROM "LoginCode" WHERE "email"=${account.shared.email}`;
    if(account.shared.walletAddress && await exists(db,"WalletNonce"))await db.$executeRaw`DELETE FROM "WalletNonce" WHERE lower("address")=lower(${account.shared.walletAddress})`;
    await db.$executeRaw`DELETE FROM "User" WHERE "id"=${account.shared.id}`;
  }
  return result;
}
