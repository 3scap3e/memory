import { requireUser } from "@/lib/server/auth";
import { cancelQuote } from "@/lib/server/auctions";
import { route } from "@/lib/server/http";
export const DELETE = route(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(); const { id } = await ctx.params; await cancelQuote(id, user.id); return Response.json({ ok: true });
});
