import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@modelcontextprotocol/sdk', '@remotion/lambda'],
};

export default nextConfig;
