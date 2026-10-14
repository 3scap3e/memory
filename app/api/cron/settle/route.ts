import { timingSafeEqual } from "node:crypto";
import { sweepClocks } from "@/lib/server/closing";
import { settlePayouts, sweepIncoming } from "@/lib/server/auctions";
import { HttpError, requireEnv, route } from "@/lib/server/http";
export const POST = route(async (request: Request) => {
  const expected = Buffer.from(`Bearer ${requireEnv("CRON_SECRET")}`);
  const given = Buffer.from(request.headers.get("authorization") || "");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new HttpError(401, "Unauthorized");
  const incoming = await sweepIncoming();
  const processed = await settlePayouts();
  await sweepClocks();
  return Response.json({ processed, incoming });
});
