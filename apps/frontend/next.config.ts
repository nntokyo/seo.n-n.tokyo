import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 本番デプロイでは別ディレクトリへ完成させてから原子的に切り替える。
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
