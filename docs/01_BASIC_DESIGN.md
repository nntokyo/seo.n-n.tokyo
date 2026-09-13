# 01. システム基本設計書 & 全画面一覧 (BASIC DESIGN)

> **プロジェクト名称**: SEO Analyzer  
> **ドキュメント種別**: システム基本設計書（アーキテクチャ・全25画面一覧・業務フロー・非機能要件）  
> **版数**: 2.2.0 (バックエンド/フロントエンド完全分離 & ゼロダウンタイムWebhook対応版)

---

## 1. システム全体アーキテクチャ (分離アーキテクチャ)

本システムは、低遅延なリアルタイム単一URL監査、数千ページ規模の非同期ディープクロール、Google公式API統合、およびAI表示最適化（GEO/LLMO）を統合したハイパフォーマンスWebプラットフォームです。

フロントエンド（UI/SSR）とバックエンド（API/Worker/Crawler）は物理的プロセス・ポート・コードベースを完全に分離し、Caddyリバースプロキシによって統一FQDN（`https://seo.n-n.tokyo`）の下で透過的にルーティングされます。

```mermaid
graph TD
    Client["Webブラウザ (PC / モバイル)\nhttps://seo.n-n.tokyo"]
    Caddy["Caddy v2 リバースプロキシ\n(SSL終端 / HTTP3 / Zstd / SSEバッファ無効化)"]
    
    Client -->|HTTPS 443| Caddy

    subgraph CaddyRouting["Caddy URLルーティング"]
        Caddy -->|/webhook| WebhookWorker["Port 9104: GitHub Webhook Server\n(HMAC-SHA256署名検証 & ゼロダウンタイムデプロイ)"]
        Caddy -->|/api/*, /sse/*| BackendApp["Port 5601: バックエンド (Fastify / Node.js)\n(REST API, SSE Stream, Playwright, Gemini)"]
        Caddy -->|/* (UI, Pages)| FrontendApp["Port 5600: フロントエンド (Next.js 15)\n(React 19, shadcn/ui, Tailwind v4, D3.js)"]
    end

    subgraph BackendWorkers["バックエンド内部処理 & キュー基盤"]
        FastWorker["Fast HTML Analyzer (Cheerio)"]
        BrowserWorker["Headless Chromium Cluster (Playwright)"]
        AiWorker["AI / GEO Engine (Google Gemini 2.0 API)"]
        GoogleHub["Google API Hub (PSI, Search Console, Safe Browsing, Indexing)"]
        RedisStore[("Redis 7 (キュー & キャッシュ)")]
    end

    subgraph DataStore["永続データストア"]
        Postgres[("Docker PostgreSQL 16 (Port 5432 - DB: seo)")]
        Storage[("Cloud Storage / ローカル reports/")]
    end

    BackendApp --> FastWorker & BrowserWorker & AiWorker & GoogleHub
    BackendApp --> Postgres
    BackendApp --> RedisStore
    FrontendApp -.->|SSR内部フェッチ /api/*| BackendApp
```

---

## 2. システム高可用性 & ゼロダウンタイム原則

1. **完全非同期・独立稼働**: バックエンドで重いPlaywrightクロールやAI解析を実行中であっても、フロントエンドのNext.js UIの表示速度には一切影響を与えません。
2. **ゼロダウンタイム・デプロイ**: GitHub Webhook受信時、新コードのビルドとヘルスチェックが完全に通過するまで旧プロセスがトラフィックを処理し続けるため、デプロイ中も502エラーやダウンタイムは発生しません。
3. **自動ロールバック**: 新規コミットで万が一ビルドエラーや起動例外が発生した場合、自動的に直前の正常コミットへロールバックし、システム稼働を維持します。

---

## 3. 全27画面一覧マトリクス & インタラクティブUI設計規約

すべての画面において、表示されるボタン、タブ、リンク、アクションカードは単なる装飾（ダミーUI）であってはならず、クリック時に即座に状態変更・画面遷移・コピー・モーダル表示などのフィードバックを提供する完全なインタラクティブ性を備えます。

| 画面ID | 画面名称 | ルーティング (Frontend) | 連携バックエンドAPI |
|---|---|---|---|
| **SCR-01** | トップ / 即時URL診断 | `/` | `POST /api/v1/audit/quick` |
| **SCR-02** | 診断リアルタイム進捗 | `/audit/progress/:id` | `GET /sse/audit/:id` (SSE) |
| **SCR-03** | 総合診断ダッシュボード | `/audit/:id` | `GET /api/v1/audit/results/:id` |
| **SCR-04** | メタ不具合インスペクター | `/audit/:id/meta` | `GET /api/v1/audit/:id/meta-defects` |
| **SCR-05** | Raw vs Rendered DOM差分 | `/audit/:id/dom-diff` | `GET /api/v1/audit/:id/dom-diff` |
| **SCR-06** | AI表示 (GEO) シミュレータ| `/audit/:id/ai-preview` | `GET /api/v1/audit/:id/ai-preview` |
| **SCR-07** | 具体的修正コード提案 | `/audit/:id/proposals` | `GET /api/v1/audit/:id/proposals` |
| **SCR-08** | Core Web Vitals詳細 | `/audit/:id/cwv` | `GET /api/v1/audit/:id/cwv` |
| **SCR-09** | 構造化データ検証 | `/audit/:id/schema` | `GET /api/v1/audit/:id/schema` |
| **SCR-10** | ディープクロール管理 | `/crawl/new` | `POST /api/v1/crawl/start` |
| **SCR-11** | クロールリアルタイム進捗 | `/crawl/:sessionId` | `GET /sse/crawl/:sessionId` |
| **SCR-12** | 内部リンク有向グラフ | `/crawl/:sessionId/graph` | `GET /api/v1/crawl/:sessionId/graph` |
| **SCR-13** | リンク切れ (404) 一覧 | `/crawl/:sessionId/broken`| `GET /api/v1/crawl/:sessionId/broken` |
| **SCR-14** | サイト構造階層ツリー | `/crawl/:sessionId/tree` | `GET /api/v1/crawl/:sessionId/tree` |
| **SCR-15** | プロジェクト一覧 | `/projects` | `GET /api/v1/projects` |
| **SCR-16** | プロジェクト詳細・推移 | `/projects/:id` | `GET /api/v1/projects/:id/history` |
| **SCR-17** | Time-Travel 履歴差分 | `/projects/:id/diff` | `GET /api/v1/projects/:id/diff` |
| **SCR-18** | GSC URL Inspection | `/google/inspect` | `POST /api/v1/google/inspect` |
| **SCR-19** | Google Indexing 通知 | `/google/indexing` | `POST /api/v1/google/index-publish` |
| **SCR-20** | llms.txt 自動合成ツール | `/tools/llms-txt` | `POST /api/v1/tools/generate-llms-txt`|
| **SCR-21** | PDFレポート出力 | `/reports/:id` | `GET /api/v1/reports/:id/pdf` |
| **SCR-22** | 監視アラート・通知設定 | `/settings/alerts` | `POST /api/v1/projects/:id/notify/test`|
| **SCR-23** | Google APIアカウント連携 | `/settings/integrations` | `GET /api/v1/integrations/google/auth-url` |
| **SCR-24** | チーム・メンバー管理 | `/settings/team` | `GET /api/v1/team/members` |
| **SCR-25** | APIキー・Webhook管理 | `/settings/api-keys` | `GET /api/v1/settings/api-keys` |
| **SCR-26** | サイトマップ&ハブ・カノニカル分析 | `/tools/sitemap-analyzer` | `POST /api/v1/tools/validate-sitemap` |
| **SCR-27** | Google公式統合ハブ (PSI/GSC/GA4/Gemini) | `/google/hub` | `POST /api/v1/google/hub-data` |
| **SCR-28** | ユーザー認証 (ログイン・新規登録) | `/login` | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/google/callback` |

---

## 4. ユーザー認証・認可アーキテクチャ (AUTH ARCHITECTURE)

本システムは、セキュアなマルチテナント利用およびプロジェクト保護のため、**「メールアドレス＋パスワード認証」** および **「Googleアカウント認証 (OAuth 2.0)」** のハイブリッドログイン方式を採用します。

```mermaid
graph TD
    Client["フロントエンド (Web UI)"]
    AuthAPI["認証API (/api/v1/auth/*)"]
    GoogleAuth["Google OAuth 2.0 (Google Identity)"]
    UserStore[("ユーザーDB / セッションストア")]

    Client -->|メールアドレス + パスワード| AuthAPI
    Client -->|Googleでログイン (ワンクリック)| GoogleAuth
    GoogleAuth -->|OAuthコールバック (IDトークン/アクセストークン)| AuthAPI
    AuthAPI -->|Argon2/PBKDF2 ハッシュ検証 / Google検証| UserStore
    AuthAPI -->|JWT認証トークン (HttpOnly / Bearer) 発行| Client
```

### 認証方式の仕様
1. **メールアドレス＋パスワード認証**:
   - パスワードはソルト付き暗号化ハッシュ（PBKDF2 / Argon2）で不可逆暗号化して保存。
   - 新規登録時に即座に組織・アカウントを作成し、自動ログイン完了。
2. **Googleログイン (OAuth 2.0 / Google Identity)**:
   - Googleアカウントでワンクリックログイン。
   - 取得したメールアドレス、氏名、プロフィールアイコンを自動同期。
   - Google Search Console / GA4 のアクセス権限スコープともスムーズに統合可能。
3. **セッション維持 & トークン管理**:
   - `JWT (JSON Web Token)` または暗号化セッションIDをCookie / Bearerヘッダーで管理。
   - ログインユーザーの所属組織（Organization）に応じたプロジェクト・監査履歴の完全分離。
