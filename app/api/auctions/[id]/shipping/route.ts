import { requireUser } from "@/lib/server/auth";
import { winnerShipment, saveWinnerAddress } from "@/lib/server/shipping";
import { json, route } from "@/lib/server/http";
type Context={params:Promise<{id:string}>};
export const GET=route(async (_request:Request,ctx:Context)=>{const user=await requireUser();const {id}=await ctx.params;return Response.json({shipment:await winnerShipment(id,user.id)},{headers:{"Cache-Control":"private, no-store"}});});
export const PUT=route(async (request:Request,ctx:Context)=>{const user=await requireUser();const {id}=await ctx.params;return Response.json({shipment:await saveWinnerAddress(id,user.id,(await json(request)).address)},{headers:{"Cache-Control":"private, no-store"}});});
