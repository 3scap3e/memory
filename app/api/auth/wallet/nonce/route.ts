import { nonce } from "@/lib/server/auth";
import { json, route } from "@/lib/server/http";
export const POST = route(async (request: Request) => { const body = await json(request); return Response.json(await nonce(request, body.address)); });
