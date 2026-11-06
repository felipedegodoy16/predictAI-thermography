import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.60.10"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
