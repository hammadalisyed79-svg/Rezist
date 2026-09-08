import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is for Docker only. Vercel breaks if this is always on.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  eslint: {
    // Keep production builds from failing on lint noise during deploy
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
