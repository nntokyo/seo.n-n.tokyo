# 08. 運用・インフラ・セキュリティ設計書 (OPERATIONS & SECURITY)

> **プロジェクト名称**: SEO Analyzer  
> **本番ドメイン**: `seo.n-n.tokyo`  
> **本番サーバーホスト**: `ssh home` (社内本番サーバー)  
> **Gitリポジトリ**: `git@nntokyo:nntokyo/seo.n-n.tokyo.git` (branch: `main`)  
> **Webルート**: `/Datas/www/seo.n-n.tokyo`  
> **注意**: 本リポジトリは公開リポジトリのため、実パスワード・機密情報は一切記載せず、プレースホルダー表記とします。

---

## 1. 本番サーバー環境概要

合同会社NNの自社インフラ基準に準拠し、本番サーバー `home` 上でPM2、Docker PostgreSQL 16、Caddyリバースプロキシ、およびcron自動デプロイパイプラインにより運用します。

```mermaid
flowchart TD
    Client["一般ユーザー / Webブラウザ"] -->|HTTPS (Port 443)| Caddy["Caddy v2 リバースプロキシ\n(/etc/caddy/Caddyfile)\n(Let's Encrypt 自動SSL / HTTP/3 / Zstd / SSEフラッシュ)"]
    
    subgraph HomeServer["本番サーバー (ssh home)"]
        Caddy -->|リバースプロキシ| PM2["PM2: seo-n-n-tokyo\n(Port 5600 / Next.js 15 App Server)"]
        
        Cron["Crontab (2分ポーリング)\n(/Datas/www/seo.n-n.tokyo/infra/cron-deploy.sh)"] -.->|コミット検知| GitReset["git reset --hard & pnpm build & pm2 reload"]
        
        PM2 --> PostgreSQL["Docker PostgreSQL 16 (Port 5432)\nDB: seo / User: seo"]
        PM2 --> Redis["Redis 7 (Port 6379)\n(BullMQ & キャッシュ)"]
    end

    GitHub["GitHub (git@nntokyo:nntokyo/seo.n-n.tokyo.git)"] -->|fetch origin main| Cron
```

---

## 2. インフラ諸元表 (Specification Matrix)

| 項目 | 本番設定値 | 備考 |
|---|---|---|
| **サーバーホスト** | `home` (社内本番サーバー) | SSH接続: `ssh home` |
| **公開FQDN** | `https://seo.n-n.tokyo` | Caddyによる自動Let's Encrypt SSL終端 |
| **Gitリポジトリ** | `git@nntokyo:nntokyo/seo.n-n.tokyo.git` | デプロイブランチ: `main` |
| **配置パス (BASE)** | `/Datas/www/seo.n-n.tokyo` | Webルート配下 |
| **内部バインドポート** | `127.0.0.1:5600` | 専用ポート |
| **プロセスマネージャー** | PM2 (`seo-n-n-tokyo`) | 設定ファイル: `ecosystem.config.cjs` (メモリ上限 512MB) |
| **Node.js / pnpm** | Node.js v22 LTS / pnpm v10.x | `$HOME/.nvm/versions/node/...` |
| **データベース** | Docker PostgreSQL 16 (`127.0.0.1:5432`) | DB名: `seo`, ユーザー名: `seo` |
| **Webサーバー** | Caddy v2 | 設定: `/etc/caddy/Caddyfile` |
| **自動デプロイ** | 2分間隔 cron ポーリング | スクリプト: `infra/cron-deploy.sh` |
| **状態管理ファイル** | `/Datas/www/seo.n-n.tokyo/.state/deployed.sha` | 前回正常デプロイ済みCommit SHAを記録 |
| **ログ配置先** | `/Datas/www/seo.n-n.tokyo/logs/` | `cron-deploy.log`, PM2標準出力/エラーログ |

---

## 3. Caddyfile 設定仕様 (`infra/caddy-snippet.txt`)

`/etc/caddy/Caddyfile` に以下のブロックを追記し、`sudo systemctl reload caddy` を実行します。

```caddyfile
# ==============================================================================
# SEO Analyzer (seo.n-n.tokyo)
# ==============================================================================
seo.n-n.tokyo {
    encode gzip zstd

    # セキュリティヘッダー
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    # 静的アセットキャッシュ
    @static {
        path /_next/static/*
        path /favicon.svg
        path /favicon.ico
        path /icon.svg
        path /logo.svg
        path /apple-touch-icon.png
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # レポートPDF出力
    handle_path /reports/* {
        root * /Datas/www/seo.n-n.tokyo/public/reports
        file_server
    }

    # Next.js アプリケーション (PM2: 127.0.0.1:5600)
    reverse_proxy 127.0.0.1:5600 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Server-Sent Events (SSE) リアルタイム進捗ストリーミングのバッファリング無効化
        flush_interval -1
    }
}
```

---

## 4. PM2 起動設定 (`ecosystem.config.cjs`)

```javascript
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
```

---

## 5. 自動デプロイ パイプライン仕様 (`infra/cron-deploy.sh`)

### 5.1 動作メカニズム
1. **二重起動防止**: `flock -n 9 /tmp/seo-n-n-tokyo-cron-deploy.lock` により並列実行を完全防止。
2. **Gitポーリング**: `git fetch origin main` を実行し、リモートSHAと `.state/deployed.sha` を比較。
3. **安全同期**: 新規コミット検知時のみ以下を順次実行：
   - `git reset --hard origin/main` (.env, logs, .stateは保護)
   - `pnpm install --frozen-lockfile`
   - `./node_modules/.bin/prisma db push --accept-data-loss` (DBスキーマ安全反映)
   - `./node_modules/.bin/prisma generate`
   - `pnpm build`
   - `pm2 restart seo-n-n-tokyo --update-env`
   - `curl http://127.0.0.1:5600/` ヘルスチェック（最大15秒待機）
   - ヘルスチェック合格時のみ `.state/deployed.sha` を更新。

### 5.2 Crontab 登録エントリ
```cron
# seo.n-n.tokyo 自動デプロイ (2分ごと)
*/2 * * * * /Datas/www/seo.n-n.tokyo/infra/cron-deploy.sh >> /Datas/www/seo.n-n.tokyo/logs/cron-deploy.log 2>&1
```

---

## 6. セキュリティ & SSRF防御仕様

本番サーバー環境において、診断クローラーが社内イントラネットや他の自社サービスへSSRFリクエストを送信することを**DNSレイヤーで厳格にブロック**します。

- **禁止IPレンジ**:
  - `192.168.0.0/16` (社内LAN全域)
  - `127.0.0.0/8`, `::1` (ローカルホスト)
  - `10.0.0.0/8`, `172.16.0.0/12` (プライベートIP)
  - `169.254.169.254` (リンクローカル/クラウドメタデータ)
- **トークン保護**: `google_integrations` に保存するOAuthトークン等は **AES-256-GCM** で暗号化し、環境変数 `ENCRYPTION_MASTER_KEY` を用いて保護します。
