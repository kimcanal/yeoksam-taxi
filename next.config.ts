import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["163.239.77.91"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
