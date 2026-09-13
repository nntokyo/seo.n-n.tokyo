/**
 * PM2 起動設定
 *
 * 本リポジトリは公開リポジトリのため、機密情報・パスワード・秘密鍵は一切含めません。
 * 接続情報・環境変数はサーバー上の .env (git除外) から安全に読み込まれます。
 */
module.exports = {
  apps: [
    {
      name: "seo-n-n-tokyo",
      cwd: "/Datas/www/seo.n-n.tokyo",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 5600",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5600",
        HOST: "127.0.0.1",
        HOSTNAME: "127.0.0.1",
        NEXT_PUBLIC_APP_URL: "https://seo.n-n.tokyo",
        NEXT_PUBLIC_DOMAIN: "seo.n-n.tokyo",
      },
      max_memory_restart: "512M",
    },
  ],
};
