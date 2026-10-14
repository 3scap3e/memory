import "server-only";
import { connection } from "next/server";
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const env = (key: string) => process.env[key]?.trim() || null;
export function requireEnv(key: string) { const value = env(key); if (!value) throw new HttpError(503, `${key} is not configured yet`); return value; }
export function origin(request: Request) { return new URL(env("APP_URL") || request.url).origin; }
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    await connection();
    try {
      const request = args[0];
      if (request instanceof Request && request.method !== "GET") {
        const from = request.headers.get("origin");
        if (from && from !== origin(request)) throw new HttpError(403, "Cross-origin request denied");
      }
      return await handler(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error("Memory request failed", e instanceof Error ? e.name : "Unknown error");
      return Response.json({ error: "Could not complete this request. Please try again." }, { status: 500 });
    }
  };
}
export async function json(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Use application/json");
  const text = await request.text();
  if (text.length > 8192) throw new HttpError(413, "Request is too large");
  try { const body = JSON.parse(text); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); return body; }
  catch { throw new HttpError(400, "Invalid request body"); }
}
