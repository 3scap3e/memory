import { requireUser, logout } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { route, HttpError, json as readJson } from "@/lib/server/http";
import { connection } from "next/server";
import { eligibility,removeAccount } from "@/integrations/shared-account/server";
export const GET=route(async()=>{await connection();const user=await requireUser();const result=await db().$transaction(tx=>eligibility(tx,{wallet:user.walletAddress}));return Response.json({allowed:result.allowed,reasons:result.reasons,memoryLinked:result.memoryLinked},{headers:{"Cache-Control":"private, no-store"}});});
export const POST=route(async(request:Request)=>{
 await connection();
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,"Cross-origin request denied");
 const body=await readJson(request) as {confirmation?:unknown};if(body.confirmation!=="DELETE")throw new HttpError(400,"Type DELETE to confirm account deletion");
 const user=await requireUser();
 await db().$transaction(async tx=>{const result=await removeAccount(tx,{wallet:user.walletAddress});if(!result.allowed)throw new HttpError(409,result.reasons.join(" "));},{isolationLevel:"Serializable"});
 await logout();return Response.json({deleted:true});
});
