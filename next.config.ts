import type { NextConfig } from "next";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  distDir: process.env.ANVIL_TEST_MODE === "true" ? ".next-anvil" : ".next",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default function configure(phase: string): NextConfig {
  const local = phase === PHASE_DEVELOPMENT_SERVER;
  if (!local) {
    // Old development validators can still reference routes excluded from build.
    for (const directory of [".next/dev/types", ".next-anvil/dev/types", ".next-anvil/types"]) {
      rmSync(join(process.cwd(), directory), { recursive: true, force: true });
    }
  }
  const ownerAliases = Object.fromEntries(["refund-queue", "shipping-queue"].map(name => {
    const target = local && existsSync(join(process.cwd(), `.local/owner/ui/${name}.tsx`)) ? `./.local/owner/ui/${name}.tsx` : `./lib/owner-ui/${name}.tsx`;
    return [`@/owner-ui/${name}`, target];
  }));
  // Local source is never committed; production has no owner API routes.
  for (const name of ["admin", "test", "cron"]) {
    const source = join(process.cwd(), ".local/owner/api", name);
    const generated = join(process.cwd(), "app/api", name);
    rmSync(generated, { recursive: true, force: true });
    if (local && name !== "cron" && existsSync(source)) {
      cpSync(source, generated, { recursive: true });
    }
  }
  return { ...nextConfig,
    turbopack: { ...nextConfig.turbopack, resolveAlias: ownerAliases },
    webpack(config) { for (const [name, target] of Object.entries(ownerAliases)) config.resolve.alias[name] = join(process.cwd(), target); return config; },
  };
}
