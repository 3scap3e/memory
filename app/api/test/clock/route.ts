import { requireAdmin } from "@/lib/server/auth";
import { chain } from "@/lib/server/chain";
import { sweepClocks } from "@/lib/server/closing";
import { env,HttpError,json,route } from "@/lib/server/http";
import { isAnvil,localUrl } from "@/lib/network";
export const POST=route(async(request:Request)=>{
 if(!isAnvil()||env("ANVIL_TEST_MODE")!=="true"||!localUrl(env("APP_URL")||""))throw new HttpError(404,"Test clock is unavailable");
 await requireAdmin();if(await chain().getChainId()!==31337)throw new HttpError(403,"The test clock only supports local Anvil");
 const {seconds}=await json(request);if(typeof seconds!=="number"||!Number.isInteger(seconds)||seconds<1||seconds>864000)throw new HttpError(400,"Choose 1–864000 seconds");
 const rpc=chain().request as (input:{method:string;params:unknown[]})=>Promise<unknown>;
 await rpc({method:"evm_increaseTime",params:[seconds]});await rpc({method:"evm_mine",params:[]});await sweepClocks();return Response.json({advanced:seconds});
});
