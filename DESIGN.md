# SEO Analyzer — DESIGN.md

> **AIが解釈・実装するためのUI/UXデザイン言語 & デザイントークン規約**  
> Linear、Vercel、Stripe、Raycast等の世界的モダンSaaSの設計思想を取り入れ、「AI特有の汎用的な安っぽさ」を完全に排除した最高峰のUI/UXを構築するための仕様書です。

---

## 💎 コアデザイン原則 (Core Principles)

1. **High Information Density & Visual Hierarchy (高密度と極上の視覚階層)**
   - 無駄な余白を排し、1画面内に100以上のSEOメトリクス、Core Web Vitals、Google公式データ、AI引用シミュレーションを理路整然と整理。
   - 重要度（Critical 🚨 / Warning ⚠️ / Notice ℹ️ / Good ✅）に応じた直感的なタイポグラフィとカラーコントラスト。

2. **Dark-First Terminal Aesthetic (引き締まったプロフェッショナル・ダークUI)**
   - 最深層背景（`#090D16`）に微小なグリッドパターンと繊細なグラデーション光彩（Cyan / Violet / Emerald）を重ね、開発者・SEOアナリストが長時間没入できる高級感を実現。

3. **Subtle Depth & Glassmorphism (微細な陰影とガラスモーフィズム)**
   - ベタ塗りではなく、`backdrop-blur-md`、1pxの極細境界線（`border border-white/10`）、内側シャドウ（`shadow-inner`）によるリッチな浮遊感。

4. **Actionable & Instant Feedback (即時性と行動直結のマイクロインタラクション)**
   - URL入力から0秒で動き出すSSEストリーミング進捗プログレス。
   - 課題カードに常に「Before/After 差分」と「コピペ用コードボタン」を同居させ、1タップで課題解決が完了する導線設計。

---

## 🎨 デザイントークン (Design Tokens & CSS Variables)

Tailwind CSS v3/v4 および CSSカスタムプロパティ（CSS Variables）に対応したトークン定義です。

### 1. カラーパレット (Base System)

```css
:root {
  /* Canvas & Surfaces (最深層〜最前面) */
  --bg-canvas: #080B11;          /* 最深層背景 (Ultra Dark Canvas) */
  --bg-surface: #0F1623;         /* カード・パネル標準背景 */
  --bg-subtle: #162032;          /* インプット・ホバー時背景 */
  --bg-elevated: #1E2B42;        /* モーダル・ドロップダウン背景 */
  --bg-overlay: rgba(8, 11, 17, 0.85); /* モーダル背景ブラー */

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.16);
  --border-focus: rgba(6, 182, 212, 0.5); /* Cyber Cyan Focus */

  /* Typography Colors */
  --text-primary: #F8FAFC;       /* 見出し・最重要スコア (Slate 50) */
  --text-secondary: #94A3B8;     /* 本文・サブタイトル (Slate 400) */
  --text-muted: #64748B;         /* 補足・タイムスタンプ (Slate 500) */
  --text-code: #38BDF8;          /* コードハイライト (Sky 400) */

  /* Brand Accents (Cyber Tech & Intelligence) */
  --brand-cyan: #06B6D4;         /* Primary: インテリジェンス・速度 (Cyan 500) */
  --brand-cyan-glow: rgba(6, 182, 212, 0.35);
  --brand-violet: #8B5CF6;       /* AI / GEO アクセント (Violet 500) */
  --brand-violet-glow: rgba(139, 92, 246, 0.35);

  /* Status Colors (SEO & CWV 判定基準) */
  --status-good: #10B981;        /* 合格・良好 (90-100点 / CWV Good) */
  --status-good-bg: rgba(16, 185, 129, 0.12);
  --status-warning: #F59E0B;     /* 要改善 (50-89点 / Needs Improvement) */
  --status-warning-bg: rgba(245, 158, 11, 0.12);
  --status-critical: #EF4444;    /* 重大欠陥 (0-49点 / Poor) */
  --status-critical-bg: rgba(239, 68, 68, 0.12);
  --status-info: #3B82F6;        /* 軽微な最適化・Notice */
  --status-info-bg: rgba(59, 130, 246, 0.12);
}
```

---

## 🔤 タイポグラフィシステム (Typography)

### 1. フォントスタック
- **英数・メトリクス・コード**: `Inter`, `JetBrains Mono`, `-apple-system`, monospace
- **日本語テキスト**: `Inter`, `"Hiragino Sans"`, `"BIZ UDPGothic"`, `"Noto Sans JP"`, sans-serif

### 2. タイポグラフィ階層
- **Display Score (総合スコア)**: `font-mono text-6xl font-black tracking-tight text-white`
- **Section Heading (H1)**: `text-2xl font-bold tracking-tight text-slate-100`
- **Card Title (H2)**: `text-lg font-semibold text-slate-200`
- **Body Text**: `text-sm leading-relaxed text-slate-400`
- **Code Snippet**: `font-mono text-xs leading-relaxed text-sky-300 bg-slate-950/80 p-3 rounded-lg`
- **Metric Label**: `text-xs font-semibold uppercase tracking-wider text-slate-400`

---

## 📐 主要コンポーネントデザイン仕様 (UI Components)

### 1. スコアサークルメーター (`<ScoreGauge score={88} size="lg" />`)
SVGベースの円形プログレスバー。スコア帯に応じて色がダイナミックに変化。
- 90点以上: エメラルドグリーン発光 (`drop-shadow(0 0 12px rgba(16, 185, 129, 0.5))`)
- 70〜89点: サイアンブルー発光 (`drop-shadow(0 0 12px rgba(6, 182, 212, 0.5))`)
- 50〜69点: アンバーオレンジ発光 (`drop-shadow(0 0 12px rgba(245, 158, 11, 0.5))`)
- 49点以下: クリティカルレッド発光 (`drop-shadow(0 0 12px rgba(239, 68, 68, 0.5))`)

### 2. 具体的修正案カード (`<FixProposalCard />`)
- **ヘッダー**: 欠陥タイトル、配点インパクトバッジ（例: `+15点`）、重要度バッジ（`CRITICAL`）
- **解説ブロック**: Googleの評価基準とペナルティ要因の簡潔な解説
- **Before / After 差分スプリットビュー**:
  - 左ペイン（赤）: 検出された現状のコード/メタタグ
  - 右ペイン（緑）: 改善後の推奨コード（Next.js App Router / HTML）
- **アクションバー**:
  - `[ 📋 Next.jsコードをコピー ]`
  - `[ 🌐 Google公式ドキュメントを開く ]`

### 3. AI表示プレビューカード (`<AiOverviewSimulator />`)
- Google AI Overviews、Perplexity、ChatGPT Search の外観を模した忠実なUIコンポーネント。
- AIが生成した要約文、抽出されたファクトリスト、右上の引用元リンクカード（Favicon付き）をリアルタイム描画。

### 4. 内部リンク Force-Directed グラフ (`<LinkGraphVisualizer />`)
- D3.js / React Flow を用いたサイト構造の視覚化。
- ノードの大きさ = 内部PageRank（被リンク数）。
- ノードの色 = HTTPステータス（緑: 200, 橙: 301/302, 赤: 404）。
- 孤立ページ（Orphan Page）やクロール階層の深すぎるページを赤色ハイライト。
