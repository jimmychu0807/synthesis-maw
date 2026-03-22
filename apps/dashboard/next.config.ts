/**
 * Next.js application configuration.
 *
 * @module @maw/dashboard/next.config
 */
import type { NextConfig } from "next";

// Inlined to avoid importing @maw/common which isn't resolvable in next.config context
const AGENT_URL =
  process.env.AGENT_API_URL?.trim() || "http://localhost:3147";

const nextConfig: NextConfig = {
  // Static export for production: agent server serves the built files directly.
  // API proxy routes (app/api/) are only used during `next dev`.
  // Set NEXT_PUBLIC_STATIC_EXPORT=1 when building for the agent server.
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const } : {}),

  // In dev mode, proxy unmatched /api/* paths (avatars, evidence, etc.)
  // to the agent server so they work without explicit proxy routes.
  ...(process.env.STATIC_EXPORT !== "1"
    ? {
        async rewrites() {
          return {
            // fallback: only used when no page/API route matches
            fallback: [
              {
                source: "/api/:path*",
                destination: `${AGENT_URL}/api/:path*`,
              },
            ],
          };
        },
      }
    : {}),
};

export default nextConfig;
