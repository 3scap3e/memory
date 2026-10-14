import { requireUser } from "@/lib/server/auth";
import { walletActivity } from "@/lib/server/activity";
import { route } from "@/lib/server/http";
export const GET=route(async()=>{const user=await requireUser();return Response.json(await walletActivity(user.id,user.walletAddress));});
