import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the slim Docker runtime (copies only server files)
  output: "standalone",
  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,
  // Expose runtime env to the browser
  env: {
    NEXT_PUBLIC_ZERRA_URL: process.env.NEXT_PUBLIC_ZERRA_URL ?? "http://localhost:8000",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  },
};

export default nextConfig;

