import { logout } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
export const POST = route(async () => { await logout(); return Response.json({ ok: true }); });
