import type { NextConfig } from "next";

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

export default nextConfig;
