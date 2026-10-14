import { currentUser, isAdmin } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
export const GET = route(async () => { const user = await currentUser(); return Response.json({ me: user ? { id: user.id, walletAddress: user.walletAddress, isAdmin: isAdmin(user.walletAddress) } : null }); });
