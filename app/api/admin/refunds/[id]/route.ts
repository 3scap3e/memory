import { requireAdmin } from "@/lib/server/auth";
import { confirmManualRefund } from "@/lib/server/auctions";
import { json,route } from "@/lib/server/http";
export const POST=route(async(request:Request,ctx:{params:Promise<{id:string}>})=>{await requireAdmin();const {id}=await ctx.params;const body=await json(request);return Response.json(await confirmManualRefund(id,body.hash));});
