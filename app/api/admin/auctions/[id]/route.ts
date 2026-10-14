import { requireAdmin } from "@/lib/server/auth";
import { manualAction,setOpeningMinimum } from "@/lib/server/closing";
import { HttpError, json, route } from "@/lib/server/http";
export const POST = route(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireAdmin();
  const body = await json(request);
  const { id } = await ctx.params;
  if(body.action === "set_starting_minimum")return Response.json(await setOpeningMinimum(id,body.amount,user.walletAddress));
  if (body.action !== "start_countdown" && body.action !== "close") throw new HttpError(400, "Choose start_countdown or close");
  return Response.json(await manualAction(id, body.action, user.walletAddress));
});
