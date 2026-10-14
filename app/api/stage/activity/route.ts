import { requireUser, logout } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { route, HttpError, json as readJson } from "@/lib/server/http";
import { connection } from "next/server";
import { activity } from "@/integrations/shared-account/server";
export const GET=route(async()=>{await connection();const user=await requireUser();return Response.json(await activity(db(),{wallet:user.walletAddress}),{headers:{"Cache-Control":"private, no-store"}});});
