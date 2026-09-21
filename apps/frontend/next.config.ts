import type { NextConfig } from 'next';

const internalApiUrl = (process.env.INTERNAL_API_URL || 'http://127.0.0.1:5601').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 本番デプロイでは別ディレクトリへ完成させてから原子的に切り替える。
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Caddy を経由しない開発・プレビュー環境でも、ブラウザーは常に同一オリジンの
  // /api と /sse を利用する。バックエンドの接続先はサーバー側だけに保持する。
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
      {
        source: '/sse/:path*',
        destination: `${internalApiUrl}/sse/:path*`,
      },
    ];
  },
};

export default nextConfig;
