import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/mediamtx/:path*', destination: 'http://127.0.0.1:8889/:path*' },
      { source: '/cam/:path*', destination: 'http://127.0.0.1:8888/cam/:path*' },
      { source: '/cam2/:path*', destination: 'http://127.0.0.1:8888/cam2/:path*' },
    ];
  },
};

export default nextConfig;
