import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    // Keep builds from overwriting chunks used by the running dev server.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    outputFileTracingRoot: process.cwd(),
    images: {
      formats: ["image/avif", "image/webp"],
      remotePatterns: [
        { protocol: "https", hostname: "**" },
      ],
    },
  };
}
