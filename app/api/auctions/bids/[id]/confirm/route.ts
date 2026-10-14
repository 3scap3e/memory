import { requireUser } from "@/lib/server/auth";
import { confirmBid } from "@/lib/server/auctions";
import { json, route } from "@/lib/server/http";
export const POST = route(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(); const { id } = await ctx.params; const body = await json(request);
  return Response.json(await confirmBid(id, user.id, body.hash));
});
