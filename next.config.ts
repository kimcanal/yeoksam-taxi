import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.55.81",
    "192.168.55.200",
    "1.232.87.78",
    "163.239.77.91",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
