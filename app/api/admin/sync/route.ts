import { requireAdmin } from "@/lib/server/auth";
import { sweepIncoming,settlePayouts } from "@/lib/server/auctions";
import { sweepClocks } from "@/lib/server/closing";
import { route } from "@/lib/server/http";
export const POST=route(async()=>{await requireAdmin();const incoming=await sweepIncoming();const refunds=await settlePayouts();await sweepClocks();return Response.json({incoming,refunds});});
