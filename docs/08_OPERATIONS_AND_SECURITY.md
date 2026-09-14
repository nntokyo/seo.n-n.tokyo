# 08. 運用・インフラ・セキュリティ設計書 (OPERATIONS & SECURITY)

> **プロジェクト名称**: SEO Analyzer  
> **本番ドメイン**: `seo.n-n.tokyo`  
> **本番サーバーホスト**: `ssh home` (社内本番サーバー)  
> **Gitリポジトリ**: `git@nntokyo:nntokyo/seo.n-n.tokyo.git` (branch: `main`)  
> **Webルート**: `/Datas/www/seo.n-n.tokyo`  
> **注意**: 本リポジトリは公開リポジトリのため、実パスワード・機密情報は一切記載せず、プレースホルダー表記とします。

---

## 1. 本番サーバー環境概要 & ゼロダウンタイム構成

個人運営の本番サーバー `home` 上でPM2、Docker PostgreSQL 16、Caddyリバースプロキシ、および **GitHub Webhook駆動のゼロダウンタイム自動デプロイパイプライン** により運用します。

```mermaid
flowchart TD
    Client["一般ユーザー / Webブラウザ"] -->|HTTPS (Port 443)| Caddy["Caddy v2 リバースプロキシ\n(/etc/caddy/Caddyfile)\n(Let's Encrypt 自動SSL / HTTP/3 / Zstd)"]
    
    subgraph CaddyProxy["Caddy ルーティング"]
        Caddy -->|/webhook| WebhookService["127.0.0.1:9104 (GitHub Webhook)"]
        Caddy -->|/api/*, /sse/*| BackendService["127.0.0.1:5601 (seo-backend)"]
        Caddy -->|/*| FrontendService["127.0.0.1:5600 (seo-frontend)"]
    end

    subgraph ZeroDowntimePipeline["ゼロダウンタイム・デプロイ (/deploy.sh)"]
        GitHub["GitHub Push Event\n(main branch)"] -->|HMAC-SHA256署名| WebhookService
        WebhookService -->|非同期実行| DeployScript["ゼロダウンタイム・デプロイスクリプト\n(/Datas/www/seo.n-n.tokyo/infra/deploy.sh)"]
        
        DeployScript --> Step1["1. 依存関係インストール (pnpm install)"]
        Step1 --> Step2["2. DBスキーマ安全同期 (prisma db push)"]
        Step2 --> Step3["3. バックグラウンド並列ビルド (pnpm build)"]
        Step3 --> Step4["4. PM2 reload (旧プロセス稼働維持のまま新プロセス起動)"]
        Step4 --> Step5{"5. 内部ヘルスチェック (HTTP 200確認)"}
        Step5 -- 成功 --> StepOK["デプロイ完了 (ダウンタイム0秒)"]
        Step5 -- 失敗 --> StepFail["🚨 自動ロールバック (旧バージョン継続稼働)"]
    end

    BackendService --> PostgreSQL["Docker PostgreSQL 16 (Port 5432)\nDB: seo / User: seo"]
    BackendService --> Redis["Redis 7 (Port 6379)\n(BullMQ & キャッシュ)"]
```

---

## 2. システムがダウンしない耐障害性・高可用性アーキテクチャ

本システムでは、以下の5重の保護機構により**「アップデート中・デプロイ失敗時でも絶対にシステムがダウンしない」**構成を徹底しています。

### ① 事前ビルドによる旧バージョン稼働維持（No Pre-kill）
一般的なデプロイスクリプトでは「プロセス停止 ➔ ビルド ➔ 起動」を行ってしまい数分間のダウンタイム（502 Bad Gateway）が発生しますが、本システムでは **「旧プロセスがリクエストを処理し続けている間にバックグラウンドで新コードをビルド（pnpm build）」** します。

### ② PM2 reload によるGraceful Zero-Downtime Reload
ビルドが100%成功した後、PM2の `reload` コマンドを使用します。これにより、新プロセスが起動してリッスンを開始するまで旧プロセスがトラフィックを受け持ち、ダウンタイム0秒で世代交代が行われます。

### ③ 自動ヘルスチェック & 即時ロールバック機構
新プロセスのリロード後、内部エンドポイント（`http://127.0.0.1:5601/api/health` および `http://127.0.0.1:5600/`）に対して最大20秒間のヘルスチェックを実行。もし起動失敗や例外が発生した場合は、**即座に直前の正常コミットへ `git reset --hard` し、旧バージョンを無瞬断で継続稼働** させます。

### ④ Caddyリバースプロキシの自動フォールバック & エラーハンドリング
Caddyはバックエンドやフロントエンドへの接続をヘルス監視し、仮に通信エラーが発生した場合でも `flush_interval -1` と適切なタイムアウト制御によりクライアントへのパケットドロップを防止します。

### ⑤ 排他制御 (flock) による二重デプロイの完全防止
連続したGit PushやWebhookの重複受信があっても、`flock` ロックファイル（`/tmp/seo-n-n-tokyo-deploy.lock`）により多重実行を防止し、ビルドの破損を防ぎます。

---

## 3. インフラ諸元表 (Specification Matrix)

| 項目 | 本番設定値 | 役割・備考 |
|---|---|---|
| **公開FQDN** | `https://seo.n-n.tokyo` | Caddyによる自動Let's Encrypt SSL終端 |
| **Gitリポジトリ** | `git@nntokyo:nntokyo/seo.n-n.tokyo.git` | デプロイブランチ: `main` |
| **配置パス (BASE)** | `/Datas/www/seo.n-n.tokyo` | Webルート配下 |
| **フロントエンド** | `127.0.0.1:5600` (PM2: `seo-frontend`) | Next.js 15 UI / SSR |
| **バックエンド** | `127.0.0.1:5601` (PM2: `seo-backend`) | Fastify API / クローラー / Gemini |
| **GitHub Webhook** | `127.0.0.1:9104` (PM2: `seo-webhook`) | GitHub Pushイベント受信 & デプロイキック |
| **外部Webhookパス** | `https://seo.n-n.tokyo/webhook` | GitHubリポジトリ設定用URL |
| **データベース** | Docker PostgreSQL 16 (`127.0.0.1:5432`) | DB名: `seo`, ユーザー名: `seo` |
| **プロセスマネージャー** | PM2 (`ecosystem.config.cjs`) | 3プロセス統合管理 |
| **状態管理ファイル** | `/Datas/www/seo.n-n.tokyo/.state/deployed.sha` | 前回デプロイ成功Commit SHA |
| **ログ配置先** | `/Datas/www/seo.n-n.tokyo/logs/` | デプロイログ、PM2標準出力/エラーログ |

### PageSpeed APIの日次上限対応

PageSpeed Insights APIの成功結果は `.data/google-cache` に24時間保存します。このディレクトリは公開領域およびGit管理の対象外とし、APIキーは保存しません。429発生時に自動再試行は行わず、期限切れキャッシュが存在する場合だけ暫定データとして返します。公開ハブでは `PUBLIC_SITE_URL` と送信先originが一致する場合だけシステムキーを許可し、外部サイトへの未認証キーレス呼び出しは禁止します。運用者はエラーに含まれる `project_number` と、Google Cloud Consoleで選択しているプロジェクトが一致することを確認し、必要に応じて `Queries per day` の上限変更を申請します。

---

## 4. GitHub Webhook の設定手順

GitHubリポジトリ（`git@nntokyo:nntokyo/seo.n-n.tokyo.git`）の Settings > Webhooks にて以下を設定します：

1. **Payload URL**: `https://seo.n-n.tokyo/webhook`
2. **Content type**: `application/json`
3. **Secret**: `.env` に定義した `DEPLOY_WEBHOOK_SECRET` と同一の文字列（HMAC-SHA256署名検証に使用）
4. **Which events would you like to trigger this webhook?**: `Just the push event`
5. **Active**: 有効 (Check)
