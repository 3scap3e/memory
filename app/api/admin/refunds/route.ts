import { requireAdmin } from "@/lib/server/auth";
import { refundQueue } from "@/lib/server/activity";
import { treasury } from "@/lib/server/chain";
import { route } from "@/lib/server/http";
export const GET=route(async()=>{await requireAdmin();return Response.json({refunds:await refundQueue(),treasury:treasury()});});
