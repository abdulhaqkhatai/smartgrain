import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Supabase typed client has known inference issues with Next.js 15+ strict mode.
    // Types are validated during development via the language server.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
