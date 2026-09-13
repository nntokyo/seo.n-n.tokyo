# 04. API詳細仕様書 (API SPECIFICATION)

> **プロジェクト名称**: SEO Analyzer  
> **ドキュメント種別**: 詳細設計書（REST API・tRPC・SSEリアルタイム通信・型定義・エラーハンドリング）  
> **ベースURL**: `/api/v1`  
> **版数**: 2.0.0 (Google公式API・メタ不具合・クロール再開・履歴差分 完全対応版)

---

## 1. エンドポイント完全マトリクス

### ① 診断 & メタ不具合 & AI表示 (Audits & Meta Inspector)
| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| `POST` | `/api/v1/audit/quick` | 単一URL即時診断開始（Job発行） | 任意 (Rate Limit有) |
| `GET` | `/api/v1/audit/stream/:jobId` | SSEリアルタイム診断進捗ストリーミング | 不要 |
| `GET` | `/api/v1/audit/results/:id` | 診断総合スコア・全課題サマリー取得 | 任意 |
| `GET` | `/api/v1/audit/:id/meta-defects`| **メタタグ不具合・重複・文字化け詳細一覧** | 任意 |
| `GET` | `/api/v1/audit/:id/dom-diff` | **Raw HTML vs Rendered DOM 差分解析結果** | 任意 |
| `GET` | `/api/v1/audit/:id/ai-preview` | **Google AI Overviews / Perplexity プレビュー再現** | 任意 |
| `GET` | `/api/v1/audit/:id/proposals` | **具体的修正案・Before/Afterコード一覧** | 任意 |

### ② ディープクロール & リンクグラフ (Crawler & Graph)
| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| `POST` | `/api/v1/crawl/start` | サイト全体ディープクロールセッションの開始 | 必須 |
| `POST` | `/api/v1/crawl/:sessionId/pause` | クロールの一時停止（チェックポイント保存） | 必須 |
| `POST` | `/api/v1/crawl/:sessionId/resume`| 中断されたクロールセッションの再開 | 必須 |
| `GET` | `/api/v1/crawl/:sessionId/status`| 巡回進捗・処理ページ数・404件数 | 必須 |
| `GET` | `/api/v1/crawl/:sessionId/graph` | **D3.js用 内部リンク有向グラフ (Nodes / Edges)** | 必須 |
| `GET` | `/api/v1/crawl/:sessionId/broken`| リンク切れ（404/500）およびリンク元一覧 | 必須 |

### ③ プロジェクト管理 & 履歴差分 (Projects & Time-Travel Diff)
| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| `GET` | `/api/v1/projects` | 登録ドメイン・プロジェクト一覧 | 必須 |
| `POST` | `/api/v1/projects` | 新規ドメイン監視プロジェクトの登録 | 必須 |
| `GET` | `/api/v1/projects/:id/history` | スコア・Core Web Vitalsの日次推移データ | 必須 |
| `GET` | `/api/v1/projects/:id/diff` | **前回診断とのメタタグ・スコア変動差分比較** | 必須 |
| `POST` | `/api/v1/projects/:id/notify/test`| Slack / Webhook テスト通知送信 | 必須 |

### ④ Google公式API連携 (Google Official Integrations)
| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| `GET` | `/api/v1/integrations/google/auth-url` | Google OAuth2 認証開始URL取得 | 必須 |
| `GET` | `/api/v1/integrations/google/callback` | OAuth2 コールバック処理 & トークン保存 | 必須 |
| `POST` | `/api/v1/integrations/google/service-account` | サービスアカウントJSONキーの登録 | 必須 |
| `POST` | `/api/v1/google/inspect` | **GSC URL Inspection API 即時照会** | 必須 |
| `POST` | `/api/v1/google/index-publish` | **Google Indexing API 即時巡回通知** | 必須 |

### ⑤ ツール & エクスポート (Tools & Reports)
| メソッド | パス | 説明 | 認証 |
|---|---|---|---|
| `POST` | `/api/v1/tools/generate-llms-txt` | 対象サイトの構造から `llms.txt` を自動合成 | 任意 |
| `GET` | `/api/v1/reports/:auditId/pdf` | ホワイトラベルPDFレポートのバイナリ出力 | 任意 |

---

## 2. 主要APIレスポンス型定義 (`types/api-v2.ts`)

```typescript
export interface MetaDefectDto {
  ruleId: string; // 例: 'META-001', 'META-007'
  defectCategory: 'DUPLICATION' | 'ENCODING' | 'CANONICAL' | 'ROBOTS' | 'OGP' | 'HREFLANG' | 'SSR_HYDRATION';
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
  title: string;
  detectedValues: string[]; // 複数検出されたタグの内容
  impactDescription: string;
  fixRecommendation: string;
}

export interface DomDiffDto {
  hasDifferences: boolean;
  titleDiff?: { raw: string; rendered: string; isMismatch: boolean };
  canonicalDiff?: { raw: string; rendered: string; isMismatch: boolean };
  robotsDiff?: { raw: string; rendered: string; isMismatch: boolean };
  linksAddedByJsCount: number;
  hydrationErrorsDetected: string[];
}

export interface CrawlGraphDto {
  nodes: {
    id: string;
    url: string;
    depth: number;
    httpStatus: number;
    inLinksCount: number;
    pageRank: number;
  }[];
  edges: {
    source: string;
    target: string;
    anchorText: string;
    isNofollow: boolean;
  }[];
}

export interface TimeTravelDiffDto {
  baseAuditId: string;
  previousAuditId: string;
  daysDifference: number;
  scoreDelta: {
    overall: number; // 例: +6
    technical: number;
    content: number;
    performance: number;
  };
  resolvedIssues: string[]; // 修正された課題一覧
  newIssues: string[];      // 新たに発生した課題一覧
  changedMetaTags: {
    tag: 'title' | 'description' | 'canonical' | 'robots';
    before: string;
    after: string;
  }[];
}
```
