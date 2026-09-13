# 09. メタ情報不具合・競合・整合性 完全検知仕様書 (META DEFECT DETECTION)

> **プロジェクト名称**: SEO Analyzer  
> **ドキュメント種別**: 詳細設計書（メタタグ重複・競合・文字化け・Canonical不整合・SSRハイドレーション欠陥・Hreflang整合性）  
> **版数**: 1.0.0

---

## 1. メタ関連不具合の検知スコープ

モダンWeb開発（Next.js App Router、Nuxt、WordPress、ヘッドレスCMS等）では、複数のレイアウトコンポーネント、SEOプラグイン、サードパーティ製スクリプトが同時にメタタグを出力することにより、**「人間には見えないが、検索エンジンやSNS、AIクローラーに致命的な誤動作を引き起こすメタタグの不具合」**が頻発します。

本システムは、以下の**8大メタ欠陥カテゴリ**をリアルタイムに自動検知し、原因箇所の特定と修正コードを提示します。

```mermaid
mindmap
  root((メタ不具合検知エンジン))
    タグ重複・競合
      複数Titleタグ検出
      複数Description競合
      複数Canonicalタグ (致命的)
      Robotsタグの競合矛盾
    文字コード・文字化け
      UTF-8以外の不正文字
      1024バイト超過配置
      文字化け (Mojibake) パターン
      属性内クォートエスケープ漏れ
    Canonical・URL不整合
      HTTPへの誤指定
      相対パス指定 (無効)
      404/301先への指定
      末尾スラッシュの不一致
    Robots指示の誤設定
      意図しないnoindex漏れ
      ディレクティブのタイポ (no-index等)
      X-Robots-Tagとの矛盾
      max-snippet等のAI遮断
    OGP・ソーシャル不備
      画像URLの相対パス指定
      og:image 404/サイズ超過
      SVG画像指定 (非対応)
      og:urlとcanonicalの不一致
    Viewport・アクセシビリティ
      user-scalable=no (A11y違反)
      構文エラー・重複指定
    多言語・Hreflang不整合
      相互リンク欠落 (Return tag)
      無効な言語/国コード
      x-default指定漏れ
    SSR / CSR メタ同期不備
      初期HTMLのプレースホルダー放置
      クライアント側でのタグ遅延注入
```

---

## 2. メタ不具合検査ルールマスター (`META-*`)

### 2.1 重複・競合系不具合 (Duplication & Conflict)

| ルールID | 不具合項目名 | 判定アルゴリズム | 重大度 | 検索影響・ペナルティ |
|---|---|---|---|---|
| `META-001` | **複数Canonicalタグの重複** | DOM内に `<link rel="canonical">` が2つ以上存在するか | 🚨 **CRITICAL** (-35点) | **GoogleはCanonicalを完全に無視**し、意図しないURLがインデックスされる |
| `META-002` | **複数Titleタグの重複** | `<title>` タグが同一HTML内に2つ以上存在するか | 🚨 **CRITICAL** (-20点) | 検索結果に予期せぬタイトルが表示される |
| `META-003` | **複数Descriptionタグの重複** | `<meta name="description">` が2つ以上存在するか | ⚠️ **WARNING** (-15点) | クローラーが一方をランダム採用または破棄 |
| `META-004` | **Robotsディレクティブの矛盾** | HTML内に `index` と `noindex` が混在、またはHTMLは `index` なのにHTTPヘッダー `X-Robots-Tag` が `noindex` である状態 | 🚨 **CRITICAL** (-40点) | **最も厳しいルール（noindex）が優先採用され非インデックス化** |
| `META-005` | **複数Viewportタグの競合** | `<meta name="viewport">` が複数存在し、モバイル表示が崩れる | ⚠️ **WARNING** (-10点) | モバイルフレンドリー判定の低下 |

---

### 2.2 文字コード・文字化け系不具合 (Encoding & Mojibake)

| ルールID | 不具合項目名 | 判定アルゴリズム | 重大度 |
|---|---|---|---|
| `META-006` | **charsetタグの配置遅延** | `<meta charset="utf-8">` がHTMLの先頭 **1024バイト以降** に配置されているか（ブラウザ仕様上、1024バイト以内でなければ文字化けリスク） | ⚠️ **WARNING** (-10点) |
| `META-007` | **メタテキスト内の文字化け (Mojibake)** | Title / Description内に `ã‚¢ã‚¯`、`&#xFFFD;` (置換文字)、`???` 等の典型的なエンコード不一致パターンが存在するか | 🚨 **CRITICAL** (-30点) |
| `META-008` | **HTML属性内クォート未エスケープ** | `content="〇〇 "テキスト" 〇〇"` のように、ダブルクォートがエスケープされず属性が途中で切断されているか | 🚨 **CRITICAL** (-25点) |

---

### 2.3 Canonical・URL不整合系不具合 (Canonical Defects)

| ルールID | 不具合項目名 | 判定アルゴリズム | 重大度 |
|---|---|---|---|
| `META-009` | **相対パスのCanonical指定** | `<link rel="canonical" href="/path">` のようにスキーム（https）やホスト名が欠落している（RFC違反） | 🚨 **CRITICAL** (-25点) |
| `META-010` | **非セキュアHTTPへのCanonical** | HTTPSページであるにもかかわらず、Canonical先が `http://` になっている | 🚨 **CRITICAL** (-25点) |
| `META-011` | **エラー/転送先へのCanonical** | Canonical先URLにリクエストを送り、ステータスが `301/302/404/500` であるか | 🚨 **CRITICAL** (-35点) |
| `META-012` | **トラッキングパラメータの漏洩** | Canonical URL内に `utm_source`、`fbclid`、`gclid`、`session_id` 等のクエリが付着したままになっている | ⚠️ **WARNING** (-15点) |
| `META-013` | **末尾スラッシュの不一致** | 現在のURL（例: `/blog/`）とCanonical（例: `/blog`）でトレイリングスラッシュが食い違っている | ℹ️ **NOTICE** (-5点) |

---

### 2.4 OGP・ソーシャルメディアメタ不具合 (Social Meta Defects)

| ルールID | 不具合項目名 | 判定アルゴリズム | 重大度 |
|---|---|---|---|
| `META-014` | **og:image 相対パス指定** | `og:image` の値が `https://` で始まっていない（Twitter/Facebookは相対パスを無視し画像が表示されない） | ⚠️ **WARNING** (-15点) |
| `META-015` | **og:image リンク切れ / 超過** | `og:image` のURLが404を返す、または画像サイズが8MBを超えている（SNSシェア時に非表示） | ⚠️ **WARNING** (-15点) |
| `META-016` | **og:image 非対応フォーマット** | `og:image` に `.svg` が指定されている（主要SNSはSVGのOGPプレビューに非対応） | ⚠️ **WARNING** (-10点) |
| `META-017` | **og:url と Canonical の乖離** | `og:url` で指定されたURLと、`<link rel="canonical">` のURLが全く異なるドメイン/パスを指している | ⚠️ **WARNING** (-10点) |
| `META-018` | **twitter:card タイプ未指定** | `twitter:card` が存在しない、または無効な値（`summary_large_image` または `summary` 以外） | ℹ️ **NOTICE** (-5点) |

---

### 2.5 多言語・Hreflang整合性不具合 (Hreflang Defects)

| ルールID | 不具合項目名 | 判定アルゴリズム | 重大度 |
|---|---|---|---|
| `META-019` | **Hreflang 相互参照（Return Tag）欠落** | ページA（ja）がページB（en）を指定しているが、ページB側からページA（ja）へのリンクタグが存在しない（Google無視） | 🚨 **CRITICAL** (-25点) |
| `META-020` | **ISO言語/国コード不正** | `hreflang="jp"`（正: `ja`）や `hreflang="en-UK"`（正: `en-GB`）等のISO 639-1 / ISO 3166-1 規格外コード | ⚠️ **WARNING** (-15点) |
| `META-021` | **x-default フォールバック不在** | 3言語以上の多言語サイトで `hreflang="x-default"` が指定されていない | ℹ️ **NOTICE** (-5点) |

---

### 2.6 SSR / SPA ハイドレーション欠陥 (Hydration & Placeholder Leaks)

| ルールID | 不具合項目名 | 判定アルゴリズム | 重大度 |
|---|---|---|---|
| `META-022` | **初期HTMLのプレースホルダー放置** | 初期HTMLのTitleやDescriptionに `"Create Next App"`, `"Vite + React"`, `"Loading..."`, `"[Untitled]"` が残存 | 🚨 **CRITICAL** (-30点) |
| `META-023` | **クライアントサイド遅延注入メタ** | 静的HTML取得時にはメタタグが存在せず、Headless ChromeでJSを実行した後にのみメタタグが出現する（SSR未対応） | 🚨 **CRITICAL** (-30点) |

---

## 3. メタ不具合修正案（Before / After & Code Generation）

### 3.1 複数Canonical重複の修正例 (`META-001`)

- **Before (検出された重大欠陥)**:
  ```html
  <!-- layout.tsx と page.tsx で重複出力されている状態 -->
  <link rel="canonical" href="https://example.com/products">
  <link rel="canonical" href="https://example.com/products?category=all">
  ```
- **診断エンジンの解説**:
  > 🚨 **致命的な欠陥**: Canonicalタグが2件検出されました。Googleの公式アルゴリズム仕様により、複数Canonicalが存在する場合、Googleは両方を完全に無視します。
- **After (Next.js App Router 推奨コード)**:
  ```typescript
  // app/products/page.tsx
  // layout.tsx 側の静的canonical設定を削除し、page.tsxで単一の絶対パスを定義してください
  import type { Metadata } from 'next';

  export const metadata: Metadata = {
    alternates: {
      canonical: 'https://example.com/products', // クエリパラメータを除外した正規URL
    },
  };
  ```

---

### 3.2 og:image 相対パス & SVG指定の修正例 (`META-014`, `META-016`)

- **Before (SNSで画像が表示されないコード)**:
  ```html
  <meta property="og:image" content="/images/ogp.svg">
  ```
- **After (完全対応コード)**:
  ```typescript
  // 必ず絶対HTTPS URLとし、PNGまたはJPEG（1200x630px）を指定
  export const metadata: Metadata = {
    openGraph: {
      images: [
        {
          url: 'https://example.com/images/ogp.png',
          width: 1200,
          height: 630,
          alt: 'サービス概要アイキャッチ画像',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['https://example.com/images/ogp.png'],
    },
  };
  ```
