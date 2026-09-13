# 01. システム基本設計書 & 全画面一覧 (BASIC DESIGN)

> **プロジェクト名称**: SEO Analyzer  
> **ドキュメント種別**: システム基本設計書（アーキテクチャ・全25画面一覧・業務フロー・非機能要件）  
> **版数**: 2.0.0 (Google公式API & AI表示対応 拡張版)

---

## 1. システム全体アーキテクチャ

本システムは、低遅延なリアルタイム単一URL監査、数千ページ規模の非同期ディープクロール、Google公式API統合、およびAI表示最適化（GEO/LLMO）を統合したハイパフォーマンスWebプラットフォームです。

```mermaid
graph TD
    Client["Webクライアント (PC / モバイル / タブレット)\nNext.js 15 / React 19 / Tailwind CSS"]
    Edge["Edge Network / Reverse Proxy (Caddy / Vercel Edge)\nSSL終端 / Rate Limit / SSRFガード"]
    
    subgraph NextApp["Next.js 15 App Server"]
        AppRouter["App Router (/src/app/*)\n全25画面 & API Route Handlers"]
        SSEStreamer["SSE (Server-Sent Events) Streamer\nリアルタイム進捗配信"]
        AuthEngine["Auth.js / Supabase Auth\nSession / OAuth2 Token管理"]
    end

    subgraph QueueWorkers["非同期タスク基盤 (Redis + BullMQ)"]
        Redis[("Redis 7\n(ジョブキュー・キャッシュ)")]
        QuickQueue["queue:quick-audit"]
        CrawlQueue["queue:deep-crawl"]
        ReportQueue["queue:pdf-export"]
        
        FastWorker["Fast HTML Analyzer (Cheerio)\n高速静的DOM・メタタグ・リンク解析"]
        BrowserWorker["Headless Chrome (Playwright Pool)\nSPA動的描画・スクショ・CWV実測"]
        AiWorker["AI / GEO Analyzer (Gemini 2.0 API)\nAI引用適性判定・要約シミュレーション・修正案生成"]
    end

    subgraph DataStore["永続データストア"]
        Postgres[("PostgreSQL 16 (Prisma ORM)\n診断結果・ユーザー・Googleトークン・リンクグラフ")]
        Storage[("Cloud Storage / S3\nスクリーンショット・PDF白書・生DOM")]
    end

    subgraph ExternalServices["外部サービス & 公式API"]
        GooglePSI["Google PageSpeed Insights API (v5)\n(Lighthouse & CrUX実測値)"]
        GoogleGSC["Google Search Console API\n(URL Inspection & Search Analytics)"]
        GoogleSafe["Google Safe Browsing API (v4)"]
        GoogleIndex["Google Indexing API (v3)"]
        GoogleGemini["Google Gemini 2.0 API (Vertex AI)"]
    end

    Client <-->|HTTPS / HTTP2| Edge
    Edge <--> AppRouter
    AppRouter --> SSEStreamer
    SSEStreamer -.->|進捗Push| Client

    AppRouter --> FastWorker
    AppRouter -->|非同期依頼| Redis
    Redis --- QuickQueue & CrawlQueue & ReportQueue

    QuickQueue --> BrowserWorker
    CrawlQueue --> FastWorker & BrowserWorker
    ReportQueue --> BrowserWorker
    QuickQueue & CrawlQueue --> AiWorker

    FastWorker & BrowserWorker & AiWorker --> Postgres
    BrowserWorker --> Storage
    BrowserWorker --> GooglePSI
    FastWorker --> GoogleSafe
    AiWorker --> GoogleGemini
    AppRouter --> GoogleGSC
    AppRouter --> GoogleIndex
    AppRouter --> Postgres
```

---

## 2. 全画面一覧 (25 Routes)

本プラットフォームは、一般公開から高度なプロジェクト管理・AIシミュレーターまで全25のルートを提供します。

### ① 一般公開 & 導入導線 (Public & Marketing)
| URLパス | 画面名 | 概要 |
|---|---|---|
| `/` | トップ・即時診断入力画面 | ヒーローエリア、URL入力バー、リアルタイム進捗バー、最新公開診断ランキング |
| `/features` | 機能一覧・仕様 | 100+監査項目、Google公式API連携、AI表示対応の解説 |
| `/pricing` | 料金プラン案内 | Free（単一URL）、Pro（プロジェクト・GSC連携）、Enterprise（API無制限） |
| `/docs` | API・開発者ドキュメント | REST API仕様、Webhook設定、`llms.txt` 導入ガイド |
| `/tools` | 無料SEOツール集 | Schema.orgビルダー、OGPテスター、robots.txtジェネレーターのポータル |
| `/tools/llms-generator` | `llms.txt` スタジオ | 自社URLからAI向けマークダウン `llms.txt` を自動生成・編集・ダウンロード |
| `/tools/schema-builder` | 構造化データビルダー | Article, Organization, FAQPage のJSON-LD視覚的作成ツール |
| `/tools/meta-tester` | SERP & SNSスニペットプレビュー | Google検索結果、Twitter/X、Facebookでの表示シミュレーター |

### ② 診断結果 & 課題詳細 (Diagnostics & Audit Results)
| URLパス | 画面名 | 概要 |
|---|---|---|
| `/audit/[id]` | 総合診断ダッシュボード | 総合スコアメーター、5大カテゴリレーダーチャート、緊急課題一覧 |
| `/audit/[id]/technical` | Technical SEO詳細 | ステータスコード、HTTPS、canonical、インデックス状態詳細 |
| `/audit/[id]/content` | コンテンツ品質詳細 | タイトル/ディスクリプション文字数、見出し階層（H1-H6）、本文量 |
| `/audit/[id]/performance` | Core Web Vitals詳細 | Google PSI実測データ（LCP, INP, CLS, TTFB）、リソース削減提案 |
| `/audit/[id]/structure` | 構造化データ詳細 | JSON-LD構文検査、OGP、Twitterカード、パンくずリスト検証 |
| `/audit/[id]/ai-geo` | AI表示 & GEO詳細 | AI引用適性スコア、ファクト密度、AIスニペットメタタグ判定 |
| `/audit/[id]/simulator` | **AI表示シミュレーター** | **Google AI Overviews / SearchGPT / Perplexity での要約・引用カード再現** |
| `/audit/[id]/issues/[issueId]`| **具体的修正案・Diff詳細** | **Before/After視覚差分、Next.js/HTMLコピペコード、Google公式解説** |
| `/audit/[id]/tree` | DOM & 見出し構造ツリー | ページのHTMLアウトラインと階層エラーのインタラクティブ可視化 |

### ③ 競合比較 & サイト全体クロール (Comparison & Deep Crawl)
| URLパス | 画面名 | 概要 |
|---|---|---|
| `/compare` | 競合ドメイン比較 | 自社と競合最大3サイトの並列診断、レーダーチャート対決、タグ差分表 |
| `/crawl/[id]` | サイト全体クロールサマリー | 内部リンク巡回状況、404リンク切れ一覧、リダイレクトチェーン |
| `/crawl/[id]/graph` | **内部リンクネットワーク図** | **D3.jsによる内部PageRank・リンク構造のForce-directedグラフ** |
| `/crawl/[id]/sitemap` | サイトマップ整合性チェック | 実際の公開ページと `sitemap.xml` の過不足・不整合一覧 |

### ④ プロジェクト管理 & エクスポート (Projects & Reports)
| URLパス | 画面名 | 概要 |
|---|---|---|
| `/projects` | プロジェクト一覧 | 登録ドメイン一覧、平均健全度スコア、定点観測ステータス |
| `/projects/[projectId]` | プロジェクト詳細・推移 | スコアの日次/週次推移グラフ、Core Web Vitals変動履歴 |
| `/projects/[projectId]/settings`| 監視設定・Google連携 | GSC / PSI連携、定期巡回スケジュール、Slack/Email通知設定 |
| `/export/[id]/pdf` | クライアント用PDF白書 | 企業ロゴ・表紙付き診断レポートの印刷・PDF出力プレビュー |

---

## 3. 主要業務シーケンス (Business Flow)

### 3.1 Google公式API + AI表示対応の統合診断フロー
```mermaid
sequenceDiagram
    autonumber
    actor User as ユーザー (ブラウザ)
    participant UI as Next.js フロントエンド
    participant API as API Route Handler
    participant Fast as Fast Worker (Cheerio)
    participant Chrome as Headless Chrome (Playwright)
    participant Google as Google Official APIs (PSI / GSC / SafeBrowsing)
    participant Gemini as Google Gemini 2.0 API
    participant DB as PostgreSQL

    User->>UI: URL入力 & 「診断開始」クリック
    UI->>API: POST /api/v1/audit/quick
    API->>API: SSRF安全ガード & ジョブ発行
    API-->>UI: 202 Accepted (SSE Stream接続)
    
    par [HTML高速解析]
        API->>Fast: HTML取得、メタタグ、見出し、内部リンク抽出
        Fast->>Google: Safe Browsing 脅威検査
        Fast-->>API: 静的メトリクス完了 (30%)
        API-->>UI: SSE: progress=30%, phase='html_analyzed'
    and [実ブラウザレンダリング]
        API->>Chrome: Chromium起動、SPAレンダリング、スクリーンショット
        Chrome-->>API: DOM Snapshot完了 (60%)
        API-->>UI: SSE: progress=60%, phase='dom_rendered'
    and [Google公式API連携]
        API->>Google: PSI (Lighthouse & CrUX実測値取得)
        API->>Google: GSC URL Inspection (インデックス状態照会)
        Google-->>API: 公式実測データ返却 (85%)
        API-->>UI: SSE: progress=85%, phase='google_data_ready'
    and [AI表示シミュレーション & 修正案合成]
        API->>Gemini: コンテンツ要約・AI Overviewsシミュレーション・修正コード生成
        Gemini-->>API: AI表示データ & 改善スニペット返却
    end

    API->>API: 100点スコアリングエンジン実行 & 課題レコード構築
    API->>DB: AuditResult, PageDiagnostic, FixProposal 保存
    API-->>UI: SSE: progress=100%, event='complete', auditId='...'
    UI->>User: ダッシュボードへ自動遷移 & 診断結果描画
```
