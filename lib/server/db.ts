import "server-only";
import { PrismaClient } from "@prisma/client";
import { requireEnv } from "./http";
const globalDb = globalThis as unknown as { memoryDb?: PrismaClient };
export function db() {
  requireEnv("DATABASE_URL");
  return globalDb.memoryDb ??= new PrismaClient();
}
