/**
 * PM2 起動設定
 *
 * 1. バックエンド (seo-backend: Port 5601)
 * 2. フロントエンド (seo-frontend: Port 5600)
 * 3. GitHub Webhook 自動デプロイ (seo-webhook: Port 9104)
 *
 * 本リポジトリは公開リポジトリのため、機密情報・パスワード・秘密鍵は一切含めません。
 * 接続情報・環境変数はサーバー上の .env (git除外) から安全に読み込まれます。
 */
module.exports = {
  apps: [
    {
      name: "seo-backend",
      cwd: "/Datas/www/seo.n-n.tokyo/apps/backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5601",
        HOST: "127.0.0.1",
      },
      max_memory_restart: "768M",
    },
    {
      name: "seo-frontend",
      cwd: "/Datas/www/seo.n-n.tokyo/apps/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 5600",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5600",
        HOST: "127.0.0.1",
        INTERNAL_API_URL: "http://127.0.0.1:5601",
        NEXT_PUBLIC_APP_URL: "https://seo.n-n.tokyo",
        NEXT_PUBLIC_DOMAIN: "seo.n-n.tokyo",
        // .envから明示的に渡し、動的な/ads.txtでも参照できるようにする。
        NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID,
        // 旧変数は移行中のビルドでも所有権確認コードを維持するため引き継ぐ。
        GOOGLE_ADSENSE_CLIENT_ID: process.env.GOOGLE_ADSENSE_CLIENT_ID,
        GOOGLE_ADSENSE_PUBLISHER_ID: process.env.GOOGLE_ADSENSE_PUBLISHER_ID,
        NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID: process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID,
      },
      max_memory_restart: "512M",
    },
    {
      name: "seo-webhook",
      cwd: "/Datas/www/seo.n-n.tokyo",
      script: "infra/webhook.mjs",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        DEPLOY_WEBHOOK_PORT: "9104",
        DEPLOY_WEBHOOK_HOST: "127.0.0.1",
        DEPLOY_TARGET_BRANCH: "main",
      },
      max_memory_restart: "128M",
    },
  ],
};
