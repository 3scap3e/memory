import type { PreviewFixture } from "../app/components/wallet-context";
import type { Refund,WalletBid } from "./wallet-types";
import { AUCTION_ITEMS, minimumBid } from "./auction-rules.ts";
export const PREVIEW_STATES=["guest","empty","current","outbid","refunded","winner","owner"] as const;
export type PreviewState=typeof PREVIEW_STATES[number];
export function previewFixture(state:PreviewState):PreviewFixture & {refunds:Refund[]} {
 const address="0x1111111111111111111111111111111111111111" as const;
 const refund={id:"preview-refund",amount:"234990000",principal:"225000000",reward:"10000000",fee:"10000",status:state==="refunded"?"paid":"pending",txHash:null};
 const bid:WalletBid={id:"preview-bid",auctionId:"kingston-64",title:AUCTION_ITEMS[0].title,amount:"225000000",state:state==="winner"?"won":state==="current"?"current":"outbid",createdAt:new Date().toISOString(),paymentHash:null,refund:["outbid","refunded"].includes(state)?refund:null};
 const hasBid=["current","outbid","refunded","winner"].includes(state);
 return {me:state==="guest"?null:{id:"preview-wallet",walletAddress:address,isAdmin:state==="owner"},view:{ready:false,serverNow:Date.now(),bids:[],auctions:AUCTION_ITEMS.map((item,index)=>({id:item.id,isYourBid:index===0 && (state==="current" || state==="winner"),startingAmount:item.startingAmount.toString(),currentAmount:index===0&&hasBid?state==="current"||state==="winner"?"225000000":"255000000":"0",nextAmount:index===0&&hasBid?(state==="current"||state==="winner"?"250000000":"280000000"):minimumBid(0n,item.startingAmount).toString(),status:index===0&&state==="winner"?"closed":"open",busy:false,endsAt:index===0&&state==="current"?new Date(Date.now()+86400000).toISOString():null,extensions:0,extensionBaseline:"0",extensionVolume:"0"}))},activity:{bids:hasBid?[bid]:[],totals:{returned:state==="refunded"?refund.amount:"0",rewards:state==="refunded"?"9990000":"0",pending:state==="outbid"?refund.amount:"0"},wins:state==="winner"?[AUCTION_ITEMS[0].title]:[]},refunds:state==="owner"?[{...refund,auctionId:"kingston-64",title:AUCTION_ITEMS[0].title,recipient:"0x2222222222222222222222222222222222222222",submittedRefundHash:null,reason:"outbid",lastError:null}]:[]};
}
