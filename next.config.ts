import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Used by Dockerfile production image
  output: "standalone",
};

export default nextConfig;
