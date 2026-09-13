# SEO Analyzer — DESIGN.md

> **AIが解釈・実装するためのUI/UXデザイン言語 & デザイントークン規約**  
> 公式リファレンス:
> - [ShadcnAdmin](https://shadcnadmin.com/) — shadcn/ui, Tailwind CSS v4, `@theme`, OKLCH, pill tabs, `data-slot`, stat cards, data tables, metrics
> - [Refero Styles](https://styles.refero.design/) — AI Agent DESIGN.md Standard, typography scale, dark gallery vitrine, pill-shaped triggers, 16:10 ratio preview frames, micro-interactions
>
> 本ドキュメントは、「AI特有の汎用的な安っぽさ（AI Slop）」を完全に排除し、世界的トップSaaS（Linear, Vercel, Stripe, Raycast）を凌駕する洗練されたプロフェッショナル・ダッシュボードを構築するための絶対仕様書です。

---

## 💎 コアデザイン原則 (Core Principles)

1. **High Information Density & Visual Hierarchy (高密度と極上の視覚階層 - shadcnadmin & Refero)**
   - 無駄なホワイトスペースを排し、1画面内に100以上のSEOメトリクス、Core Web Vitals、Google公式データ、AI引用シミュレーションを理路整然と整理。
   - グリッドの境界に1pxの微細なボーダー（`grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4`）を配し、カード間のコントラストをシャープに際立たせる。
   - 重要度（Critical 🚨 / Warning ⚠️ / Notice ℹ️ / Good ✅）に応じた直感的なタイポグラフィとカラーコントラスト。

2. **Dark-First Obsidian Gallery Aesthetic (黒曜石ギャラリーの重厚感 - Refero Dark)**
   - 最深層背景（`oklch(0.12 0.015 260)` / `#080B11`）に微小なグリッドパターンと繊細なグラデーション光彩（Cyan / Violet / Emerald）を重ね、開発者・SEOアナリストが長時間没入できる高級感を実現。
   - カードには微細な角丸（`rounded-3xl` / `rounded-4xl`）と、極薄のボーダー（`border border-border/40`）を付与。

3. **Radix Primitives & `data-slot` Tokenization (ShadcnAdmin Pattern)**
   - コンポーネントはすべて Radix UI プリミティブと `data-slot` 属性（`data-slot="card"`, `data-slot="badge"`, `data-slot="pill-tab"`）を採用。
   - ピル型タブトリガー（`data-variant="pill" rounded-full`）による軽快なタブ切り替え。

4. **Actionable & Instant Feedback (即時性と行動直結のマイクロインタラクション)**
   - URL入力から0秒で動き出すSSEストリーミング進捗プログレス。
   - カードのホバー時に `scale-[1.01]` / `transition-all duration-200` を付与。
   - 課題カードに常に「Before/After 差分」と「コピペ用コードボタン」を同居させ、1タップで課題解決が完了する導線設計。

---

## 🎨 デザイントークン (Design Tokens & Tailwind CSS v4 `@theme`)

Tailwind CSS v4 の `@theme` ディレクティブおよび OKLCH カラースペースに準拠した最新のトークン定義です（`shadcnadmin.com` & `styles.refero.design` 仕様）。

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Base Surfaces (Dark-first Obsidian System) */
    --background: oklch(0.12 0.015 260);        /* #080B11 最深層キャンバス */
    --foreground: oklch(0.98 0.005 260);        /* #F8FAFC 主要テキスト */
    
    --card: oklch(0.15 0.018 260);              /* #0F1623 カード・パネル背景 */
    --card-foreground: oklch(0.98 0.005 260);
    
    --popover: oklch(0.17 0.02 260);           /* #162032 ドロップダウン・ポップオーバー */
    --popover-foreground: oklch(0.98 0.005 260);
    
    --primary: oklch(0.72 0.16 210);           /* #06B6D4 Cyber Cyan (Primary Accent) */
    --primary-foreground: oklch(0.12 0.015 260);
    
    --secondary: oklch(0.22 0.025 260);         /* #1E2B42 サブ背景 */
    --secondary-foreground: oklch(0.92 0.01 260);
    
    --muted: oklch(0.20 0.02 260);              /* ミュート背景 */
    --muted-foreground: oklch(0.65 0.02 260);   /* #94A3B8 ミュートテキスト */
    
    --accent: oklch(0.65 0.22 290);             /* #8B5CF6 AI / GEO Accent Violet */
    --accent-foreground: oklch(0.98 0.005 260);
    
    --destructive: oklch(0.60 0.24 25);         /* #EF4444 Critical Alert Red */
    --destructive-foreground: oklch(0.98 0.005 260);
    
    --border: oklch(0.24 0.02 260 / 0.5);      /* 極薄ボーダー rgba(255,255,255,0.08) */
    --input: oklch(0.24 0.02 260 / 0.7);
    --ring: oklch(0.72 0.16 210 / 0.5);        /* フォーカスリング (Cyber Cyan Glow) */

    /* Chart & Status Badges (ShadcnAdmin OKLCH Palette) */
    --status-good: oklch(0.72 0.17 160);       /* #10B981 Emerald Good (90-100) */
    --status-warning: oklch(0.78 0.16 75);     /* #F59E0B Amber Warning (50-89) */
    --status-critical: oklch(0.60 0.24 25);    /* #EF4444 Red Critical (0-49) */
    --status-info: oklch(0.68 0.18 240);       /* #3B82F6 Blue Notice */

    /* Metrics & Chart Variables */
    --chart-1: oklch(0.72 0.16 210); /* Cyan */
    --chart-2: oklch(0.65 0.22 290); /* Violet */
    --chart-3: oklch(0.72 0.17 160); /* Emerald */
    --chart-4: oklch(0.78 0.16 75);  /* Amber */
    --chart-5: oklch(0.60 0.24 25);  /* Rose */

    /* Border Radius (Refero & ShadcnAdmin Curves) */
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
    --radius-2xl: 1rem;
    --radius-3xl: 1.5rem;
    --radius-4xl: 2rem;
    --radius-pill: 9999px;
    --radius: 0.75rem;
  }
}
```

---

## 🔤 タイポグラフィシステム (Typography Scale & Stacks)

Refero Styles および ShadcnAdmin の規約に基づく高精度タイポグラフィ：

### 1. フォントスタック
- **Primary Display & Body**: `Inter`, `"Geist"`, `-apple-system`, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Data Metrics & Code**: `"JetBrains Mono"`, `"Geist Mono"`, Menlo, Monaco, Consolas, monospace
- **Japanese Text Fallback**: `"Hiragino Sans"`, `"BIZ UDPGothic"`, `"Noto Sans JP"`, sans-serif

### 2. タイポグラフィ階層
| 階層 | クラス指定 (Tailwind) | 用途 |
|---|---|---|
| **Hero Display** | `font-mono text-5xl sm:text-7xl font-black tracking-tight text-foreground` | 総合スコア (例: `94`)、大見出し数値 |
| **Section Title (H1)**| `text-2xl sm:text-3xl font-bold tracking-tight text-foreground` | 画面・主要ビューの見出し |
| **Card Title (H2)** | `text-base sm:text-lg font-semibold tracking-tight text-foreground/90` | コンポーネント・カードの見出し |
| **Subtitle / Label**| `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | KPIラベル、テーブルヘッダー |
| **Body Text** | `text-sm leading-relaxed text-muted-foreground` | 改善解説文、Google公式評価ガイダンス |
| **Code / Diff** | `font-mono text-xs leading-relaxed text-sky-300 bg-black/60 p-3 rounded-xl` | 修正前後のタグ・Next.jsコード |

---

## 🧩 主要コンポーネント仕様 (ShadcnAdmin & Refero Patterns)

### 1. KPI Stat Cards (`data-slot="stat-card"`)
- `shadcnadmin.com` の統計カードパターンを採用。
- 上段に「メトリクス名（例: `Total SEO Score`）」と「トレンドバッジ（`+12% vs last audit`）」、中段に巨大なモノスペース数値、下段にミニスパークラインチャート（Core Web Vitals または スコア推移）を内包。
- コンテナは `rounded-3xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:border-border hover:shadow-md`.

### 2. ピル型タブナビゲーション (`data-variant="pill"`)
- `styles.refero.design` に倣った、極めてクリーンなピル型切り替えバー。
```tsx
<TabsList className="inline-flex h-11 items-center justify-center rounded-full bg-muted/60 p-1.5 backdrop-blur-md border border-border/40">
  <TabsTrigger value="overview" className="rounded-full px-5 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
    総合診断
  </TabsTrigger>
  <TabsTrigger value="meta" className="rounded-full px-5 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
    メタ不具合
  </TabsTrigger>
  <TabsTrigger value="dom-diff" className="rounded-full px-5 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
    DOM差分
  </TabsTrigger>
  <TabsTrigger value="ai-geo" className="rounded-full px-5 py-2 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
    AI表示 (GEO)
  </TabsTrigger>
</TabsList>
```

### 3. ボーダーグリッドレイアウト (`Border Grid System`)
- ShadcnAdmin 特有のセパレーターラインを用いない「1pxの隙間からボーダー色を覗かせる」エレガントなグリッド方式：
```tsx
<div className="grid gap-px bg-border/40 rounded-3xl overflow-hidden border border-border/40 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard title="Performance (PSI)" score="98" status="good" />
  <StatCard title="SEO Audit" score="92" status="good" />
  <StatCard title="Meta Integrity" score="64" status="warning" />
  <StatCard title="AI / GEO Score" score="85" status="good" />
</div>
```

### 4. 具体的修正案カード & コードモーダル (`<FixProposalCard />`)
- **Badge**: 重要度バッジ（`CRITICAL` 赤, `WARNING` 黄, `INFO` 青）と獲得可能スコアバッジ（例: `+15 pts`）
- **16:10 アスペクト比メディア枠** (Refero Style): プレビュー画像、OGP画像、LCP要素のスクショ枠として `aspect-[16/10] rounded-2xl overflow-hidden border border-border/40 bg-black/40` を使用。
- **Split Code Diff**:
  - 左: `現状のコード`（赤背景・打ち消し線）
  - 右: `推奨コード (Next.js Metadata API)`（緑背景）
- **ワンクリックアクション**: コピー成功時にアイコンがチェックマークに変わり、「Copied!」ツールチップが2秒表示。

### 5. AI Overview & SearchGPT 忠実シミュレータ (`<AiSimulatorCard />`)
- Google AI Overviews、Perplexity、SearchGPT の実画面デザインを忠実に模倣したカード枠。
- 抽出された要約テキスト、生成根拠リスト、右上のファビコン付きソースリンクをそのままレンダリング。

---

## ♿ アクセシビリティ & マイクロインタラクション (A11y & Interactions)

1. **WAI-ARIA 準拠**: すべてのモーダル、ドロップダウン、ツールチップは Radix UI Primitives により適切なロールとフォーカス管理（Focus Trap, Esc Close）を保証。
2. **キーボードショートカット**: `Cmd + K` でグローバルURL検索モーダル、`1-4` キーで主要タブ切り替え。
3. **トランジション規約**:
   - ホバーエフェクト: `transition-all duration-200 ease-out`
   - モーダル・ドロワー: `data-[state=open]:animate-in data-[state=closed]:animate-out duration-200`
4. **コントラスト比**: テキストと背景のコントラスト比は WCAG 2.1 AA 基準（4.5:1以上）を厳格にクリア。
