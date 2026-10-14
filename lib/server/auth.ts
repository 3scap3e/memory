import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createSiweMessage } from "viem/siwe";
import { getAddress, isAddress, type Hex } from "viem";
import { db } from "./db";
import { HttpError, origin, env } from "./http";
import { auctionNetwork,isAnvil } from "../network";
import { chain } from "./chain";
import { isAdminWallet } from "../admin-rules";
export const isAdmin = (address: string) => isAdminWallet(address, env("AUCTION_ADMIN_WALLETS"));
export async function requireAdmin() { const user = await requireUser(); if (!isAdmin(user.walletAddress)) throw new HttpError(403, "Auction owner access required"); return user; }
const COOKIE = isAnvil()?"memory_anvil_session":"memory_session";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function nonce(request: Request, raw: unknown) {
  if (typeof raw !== "string" || !isAddress(raw)) throw new HttpError(400, "Invalid wallet address");
  const address = getAddress(raw);
  const recent = await db().memoryNonce.count({ where: { address, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent >= 5) throw new HttpError(429, "Wait a minute before trying again");
  const expiresAt = new Date(Date.now() + 5 * 60_000);
  const message = createSiweMessage({ address, chainId: auctionNetwork().chain.id, domain: new URL(origin(request)).host, uri: origin(request), version: "1", nonce: randomBytes(16).toString("hex"), issuedAt: new Date(), expirationTime: expiresAt, statement: auctionNetwork().test ? "Sign in to Memory Wars TEST MODE. Mock USDC only. Signing in does not transfer funds." : "Sign in to Memory Wars. Bids use USDC on Base. Signing in does not transfer funds." });
  const entry = await db().memoryNonce.create({ data: { address, message, expiresAt } });
  return { nonceId: entry.id, message };
}
export async function verify(request: Request, nonceId: unknown, signature: unknown) {
  if (typeof nonceId !== "string" || typeof signature !== "string" || !/^0x[0-9a-f]+$/i.test(signature)) throw new HttpError(400, "Invalid signature");
  const entry = await db().memoryNonce.findUnique({ where: { id: nonceId } });
  if (!entry || entry.expiresAt <= new Date() || !entry.message.startsWith(`${new URL(origin(request)).host} wants you`)) throw new HttpError(400, "Sign-in request expired");
  const valid = await chain().verifySiweMessage({ message: entry.message, signature: signature as Hex, domain: new URL(origin(request)).host, nonce: /Nonce: (\w+)/.exec(entry.message)?.[1], time: new Date() }).catch(() => false);
  if (!valid) throw new HttpError(401, "Could not verify your wallet signature");
  const user = await db().$transaction(async tx => {
    const consumed = await tx.memoryNonce.deleteMany({ where: { id: entry.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new HttpError(409, "This sign-in request was already used");
    return tx.memoryUser.upsert({ where: { walletAddress: entry.address }, update: {}, create: { walletAddress: entry.address } });
  });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await db().memorySession.create({ data: { tokenHash: hash(token), userId: user.id, expiresAt } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return { id: user.id, walletAddress: user.walletAddress, isAdmin: isAdmin(user.walletAddress) };
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db().memorySession.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function requireUser() { const user = await currentUser(); if (!user) throw new HttpError(401, "Connect and sign in with your wallet first"); return user; }
export async function logout() {
  const store = await cookies(); const token = store.get(COOKIE)?.value;
  if (token) await db().memorySession.deleteMany({ where: { tokenHash: hash(token) } });
  store.delete(COOKIE);
}
