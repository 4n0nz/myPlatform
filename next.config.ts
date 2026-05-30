import type { NextConfig } from "next";

const mediamtxHost = process.env.MEDIAMTX_HOST ?? "127.0.0.1";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/mediamtx/:path*", destination: `http://${mediamtxHost}:8889/:path*` },
      { source: "/cam/:path*",      destination: `http://${mediamtxHost}:8888/cam/:path*` },
      { source: "/cam2/:path*",     destination: `http://${mediamtxHost}:8888/cam2/:path*` },
    ];
  },
};

export default nextConfig;
