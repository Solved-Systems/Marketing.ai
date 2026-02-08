import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@modelcontextprotocol/sdk', '@remotion/lambda'],
  async rewrites() {
    return [
      {
        source: '/api/mcp/:key(mrkt_.*)',
        destination: '/api/mcp?api_key=:key',
      },
    ]
  },
};

export default nextConfig;
