import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";
import { shippingAddress, shippingUpdate, type ShippingUpdate } from "../shipping-rules";
async function winner(auctionId: string, userId: string) {
 const auction=await db().memoryAuction.findUnique({where:{id:auctionId}});
 if(!auction || auction.status!=="closed" || !auction.winningBidId)throw new HttpError(404,"No won auction found.");
 const bid=await db().memoryBid.findUnique({where:{id:auction.winningBidId}});
 if(!bid || bid.userId!==userId || bid.status!=="accepted")throw new HttpError(403,"Delivery details are available only to the winner.");
 return bid;
}
export function shipmentView(row: { address: Prisma.JsonValue; status: string; carrier: string|null; trackingNumber: string|null; updates: Prisma.JsonValue; updatedAt: Date } | null) {
 return row ? {address:row.address,status:row.status,carrier:row.carrier,trackingNumber:row.trackingNumber,updates:row.updates,updatedAt:row.updatedAt.toISOString()} : null;
}
export async function winnerShipment(auctionId: string,userId: string) {
 await winner(auctionId,userId);
 return shipmentView(await db().memoryShipment.findUnique({where:{auctionId}}));
}
export async function saveWinnerAddress(auctionId: string,userId: string,raw: unknown) {
 let address;try{address=shippingAddress(raw);}catch(e){throw new HttpError(400,(e as Error).message);}
 const bid=await winner(auctionId,userId);
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${auctionId} FOR UPDATE`;
  const auction=await tx.memoryAuction.findUnique({where:{id:auctionId}});
  if(auction?.winningBidId!==bid.id || auction.status!=="closed")throw new HttpError(409,"Auction result changed. Please reload.");
  const previous=await tx.memoryShipment.findUnique({where:{auctionId}});
  if(previous && (previous.trackingNumber || ["shipped","delivered"].includes(previous.status)))throw new HttpError(409,"The shipment is already underway. Contact Stagerunner to change delivery details.");
  const row=await tx.memoryShipment.upsert({where:{auctionId},create:{auctionId,winnerBidId:bid.id,userId,address,updates:[{date:new Date().toISOString(),status:"address_received",note:"Delivery details received."}]},update:{address}});
  return shipmentView(row);
 });
}
export async function shippingQueue() {
 const auctions=await db().memoryAuction.findMany({where:{status:"closed",winningBidId:{not:null}},include:{shipment:true}});
 return auctions.map(a=>({auctionId:a.id,title:a.title,shipment:shipmentView(a.shipment)}));
}
export async function updateShipment(auctionId: string,raw: Record<string,unknown>) {
 let input;try{input=shippingUpdate(raw);}catch(e){throw new HttpError(400,(e as Error).message);}
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "MemoryAuction" WHERE id = ${auctionId} FOR UPDATE`;
  const row=await tx.memoryShipment.findUnique({where:{auctionId}});
  if(!row)throw new HttpError(409,"Wait for the winner to submit delivery details.");
  const updates=Array.isArray(row.updates)?row.updates:[];
  const update:ShippingUpdate={date:new Date().toISOString(),status:input.status,note:input.note};
  return shipmentView(await tx.memoryShipment.update({where:{auctionId},data:{status:input.status,carrier:input.carrier||null,trackingNumber:input.trackingNumber||null,updates:[...updates,update]}}));
 });
}
