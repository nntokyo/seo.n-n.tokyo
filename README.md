# SEO Analyzer (次世代SEO & AEO / AIO / LLMO / GEO 技術監査プラットフォーム)

> **最高峰の技術的SEO監査・Google公式API統合・次世代AI対応（AEO / AIO / LLMO / GEO）・メタ不具合自動検知プラットフォーム**  
> 
> 公式UI/UXデザインリファレンス:
> - [ShadcnAdmin](https://shadcnadmin.com/) — shadcn/ui, Tailwind CSS v4, OKLCH, Border Grids, Stat Cards, DataTables
> - [Refero Styles](https://styles.refero.design/) — AI-Native DESIGN.md Standard, Obsidian Gallery Dark Aesthetic, 16:10 Media Containers, Pill Tabs
>
> 独立したバックエンド（API/Worker/Crawler）とフロントエンド（Next.js 15 UI）、およびGitHub Webhookによるゼロダウンタイム自動デプロイ機構を備えたエンタープライズSaaS設計です。

---

## 🚀 コア機能・ハイライト

1. **次世代AI検索・回答エンジン完全最適化 (AEO / AIO / LLMO / GEO)**
   - **AEO (Answer Engine Optimization)**: Google強調スニペット、Siri/Alexa等の音声検索、ダイレクトアンサー、Speakable/FAQPage構造化データの自動検証。
   - **AIO (AI Overviews Optimization)**: Google AI Overviewsの要約・カルーセル引用再現シミュレータ、`max-snippet:-1` メタタグ監査。
   - **LLMO (Large Language Model Optimization)**: ChatGPT Search、Claude、Geminiのインライン引用（Pill Citations）適性診断、主要AIクローラー（GPTBot, ClaudeBot等）のアクセス監査。
   - **GEO (Generative Engine Optimization)**: Perplexityソースカード再現、`llms.txt` / `llms-full.txt` Web標準自動生成、`Accept: text/markdown` 配信コード提案。
2. **Google公式API完全統合 & 具体的修正案の自動生成**
   - **PageSpeed Insights (v5)**: CrUX実測値 & LighthouseラボデータによるCore Web Vitals精密測定。
   - **Search Console URL Inspection**: Googlebot公式のインデックス状態（未登録/重複/canonical不備）照会。
   - **Safe Browsing (v4)** & **Google Indexing API (v3)**: セキュリティ脅威判定 & 即時巡回通知。
   - **Gemini 2.0 API**: 課題に対するBefore/After差分と、Next.js App Router向けコピペ用改善コードの動的生成。
3. **メタ情報・タグ競合・文字化け 完全検知エンジン**
   - 複数Canonicalタグ重複、Robotsディレクティブの矛盾、文字コード（Mojibake）の検知。
   - 相対パスCanonical/OGP画像の検出、Hreflang多言語相互リンク欠落の検出。
4. **JavaScript SEO & DOM差分解析 (Raw HTML vs Rendered DOM Diff)**
   - 静的HTMLパースとHeadless Chrome描画後のDOMを比較し、JSによる遅延メタ注入やハイドレーションエラーを可視化。
5. **サイト全体ディープクロール & 内部リンクネットワーク可視化**
   - D3.jsによる内部PageRankグラフ、リンク切れ（404）、孤立ページ、クリック階層の深さ（Click Depth）を網羅。
6. **Time-travel 履歴差分比較**
   - デプロイ前後や施策実施前後のスコア変動とタグ変更差分をタイムライン比較。

---

## 🏗️ 分離アーキテクチャ & 高可用性・ゼロダウンタイム設計

本システムは、**バックエンドAPI（Port 5601）** と **フロントエンドUI（Port 5600）** を物理的に分離し、**GitHub Webhook（Port 9104）** による完全自動かつダウンタイム0秒のデプロイパイプラインで運用されます。

```mermaid
flowchart TD
    Client["Webブラウザ (https://seo.n-n.tokyo)"] -->|HTTPS 443| Caddy["Caddy v2 リバースプロキシ\n(Let's Encrypt 自動SSL / HTTP/3 / Zstd)"]
    
    subgraph Routing["Caddy ルーティング"]
        Caddy -->|/webhook| Webhook["127.0.0.1:9104: GitHub Webhook\n(HMAC-SHA256署名検証)"]
        Caddy -->|/api/*, /sse/*| Backend["127.0.0.1:5601: seo-backend\n(Fastify API / Crawler / Gemini)"]
        Caddy -->|/*| Frontend["127.0.0.1:5600: seo-frontend\n(Next.js 15 UI / shadcn/ui)"]
    end

    subgraph ZeroDowntime["ゼロダウンタイム・パイプライン (/deploy.sh)"]
        GitHub["GitHub Push Event (main)"] -->|POST /webhook| Webhook
        Webhook -->|非同期実行| DeployScript["infra/deploy.sh"]
        DeployScript --> Build["1. バックグラウンド並列ビルド (旧プロセス稼働維持)"]
        Build --> Reload["2. PM2 reload (ダウンタイム0秒でプロセス切替)"]
        Reload --> Health{"3. 内部ヘルスチェック (200 OK)"}
        Health -- 成功 --> Success["✅ デプロイ完了"]
        Health -- 失敗 --> Rollback["🚨 自動ロールバック (旧バージョンを無瞬断維持)"]
    end

    Backend --> Postgres[("Docker PostgreSQL 16 (Port 5432)")]
    Backend --> Redis[("Redis 7 (Port 6379)")]
```

### 🛡️ システムがダウンしない耐障害性保証
1. **No Pre-kill (稼働中ビルド)**: 新コードのビルド（pnpm build）が完全に成功するまで既存プロセスを一切停止しません。
2. **Graceful Reload**: PM2の `reload` により、新プロセスがリッスンを開始した瞬間に入れ替えるため、瞬断が発生しません。
3. **自動即時ロールバック**: ビルドやヘルスチェックが失敗した場合、直前の正常コミットへ即時ロールバックし旧バージョンを維持します。
4. **二重デプロイ排他制御**: `flock` によるロックファイル管理で並列実行によるコード破損を防止します。

---

## 📚 設計書一覧 (Complete Documentation Suite)

本プロジェクトは、以下の11件の詳細仕様書により完全設計されています。

| ファイル | ドキュメント名 | 内容概要 |
|---|---|---|
| [`DESIGN.md`](./DESIGN.md) | **UI/UXデザインシステム規約** | ShadcnAdmin & Refero統合トークン、OKLCH、Border Grid、ピル型タブ |
| [`docs/00_OVERVIEW.md`](./docs/00_OVERVIEW.md) | **プロジェクト全体要件・KPI** | 背景、ターゲットユーザー、事業要件、成功KPI |
| [`docs/01_BASIC_DESIGN.md`](./docs/01_BASIC_DESIGN.md) | **基本設計書 & 全25画面一覧** | 分離アーキテクチャ、全25画面一覧、業務フロー、非機能要件 |
| [`docs/02_SEO_ANALYSIS_ENGINE.md`](./docs/02_SEO_ANALYSIS_ENGINE.md) | **SEO評価エンジン・150+検査項目** | スコアリング数式、150+検査ルール、具体的修正案生成ロジック |
| [`docs/03_DATABASE_DESIGN.md`](./docs/03_DATABASE_DESIGN.md) | **データベース詳細設計** | ER図、Prisma Schema、Google連携、AI表示、有向グラフテーブル |
| [`docs/04_API_SPECIFICATION.md`](./docs/04_API_SPECIFICATION.md) | **API詳細仕様書** | バックエンド専用ポート5601、REST API、SSE、Webhook仕様 |
| [`docs/05_UI_UX_DESIGN.md`](./docs/05_UI_UX_DESIGN.md) | **UI/UX・画面詳細設計書** | ShadcnAdminダッシュボード、Refero 16:10プレビュー、DOM差分 |
| [`docs/06_AI_GEO_OPTIMIZATION.md`](./docs/06_AI_GEO_OPTIMIZATION.md) | **AEO/AIO/LLMO/GEO最適化詳細設計書** | 強調スニペット/音声検索(AEO)、AI Overviews(AIO)、ChatGPT(LLMO)、Perplexity(GEO) |
| [`docs/07_GOOGLE_OFFICIAL_APIS.md`](./docs/07_GOOGLE_OFFICIAL_APIS.md) | **Google公式API連携仕様書** | PSI, GSC URL Inspection, Safe Browsing, Indexing, Gemini |
| [`docs/08_OPERATIONS_AND_SECURITY.md`](./docs/08_OPERATIONS_AND_SECURITY.md) | **運用・インフラ・セキュリティ設計** | ゼロダウンタイムデプロイ、GitHub Webhook設定、PM2構成、Caddy |
| [`docs/09_META_DEFECT_DETECTION.md`](./docs/09_META_DEFECT_DETECTION.md) | **メタ不具合・競合・文字化け仕様書**| タグ重複、Mojibake、Canonical不整合、SSR遅延注入、Hreflang |
| [`docs/10_CRAWLER_AND_SCRAPING_ENGINE.md`](./docs/10_CRAWLER_AND_SCRAPING_ENGINE.md) | **クローラー・SPA描画判定仕様書** | WAF対策、ハイドレーション待機、CMPバナー無効化、チェックポイント再開 |

---

## 🛠️ 技術スタック

- **Frontend (`apps/frontend` - Port 5600)**: Next.js 15 (App Router), React 19, TypeScript 5.5, Tailwind CSS v4 (`@theme`, OKLCH), shadcn/ui, Lucide React, Recharts, D3.js
- **Backend (`apps/backend` - Port 5601)**: Fastify / Node.js 22 LTS, TypeScript, Playwright (Chromium Cluster), Cheerio, BullMQ
- **Webhook & Deploy (`infra` - Port 9104)**: Node.js Webhook Server (HMAC-SHA256署名検証), `infra/deploy.sh` (Zero-downtime & Auto-rollback)
- **Database & Cache**: PostgreSQL 16 (Docker), Prisma ORM 5.22, Redis 7
- **AI & Official APIs**: Google PageSpeed Insights v5, Google Search Console API, Google Safe Browsing v4, Google Indexing v3, Google Gemini 2.0 Flash / Pro
- **Infrastructure**: Caddy v2 (Reverse Proxy & Auto SSL), PM2 (`ecosystem.config.cjs`), Linux (ssh home)
