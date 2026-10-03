import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  ExternalLink,
  FileText,
  Layers,
  Network,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AdSenseUnit } from './AdSenseUnit';

export function HomeStaticContent() {
  return (
    <>
      {/*
        AdSenseは content-visibility コンテナの外に置く。
        content-visibility: auto の内側にある広告は、未描画の間に広告コードが
        要素サイズを取得できず配信結果が不安定になるため、below-the-fold の
        位置を保ったままコンテナの外側で描画する。
      */}
      <AdSenseUnit placement="home" />

      <div className="home-deferred-content">
        {/* 4. Core Features Section (Grid with Refero Aesthetics) */}
        <section id="features" className="py-20 border-t border-white/[0.08] bg-[#080B11]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">FEATURES</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                なぜ、トップエンジニアとSEOアナリストに選ばれるのか
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <a 
                href="#aeo-llmo"
                className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-cyan-500/40 hover:bg-[#121927] transition-all group block text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">直す順番</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  影響と工数で施策を並べます。点数は作業順であり、検索順位やAIの引用は予測しません。未評価の領域は0点にしません。
                </p>
                <div className="text-xs font-mono text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>診断の見方</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </a>

              {/* Feature 2 */}
              <Link 
                href="/google/hub"
                className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-violet-500/40 hover:bg-[#121927] transition-all group block text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">Google 公式データ</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  連携したアカウントで、PageSpeed Insights のフィールドデータと Search Console の URL 検査を見ます。未連携のときはこの画面では測れません。
                </p>
                <div className="text-xs font-mono text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Google公式統合ハブを開く</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              {/* Feature 3 */}
              <Link 
                href="/tools/sitemap-analyzer"
                className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-emerald-500/40 hover:bg-[#121927] transition-all group block text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">サイトマップの中身</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  XMLサイトマップの構文、更新、URLの形を見ます。canonical タグそのものは読みません。サイトマップは発見のヒントであり、クロールも掲載も保証しません。
                </p>
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>サイトマップ分析ツールを開く</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* 5. AEO / LLMO Detailed Section */}
        <section id="aeo-llmo" className="py-20 border-t border-white/[0.08] bg-[#0B101A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-medium mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>検索セントラルに沿った確認</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                  引用確率は出しません。<br />
                  直す順番を出します。
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                  Google 検索は、llms.txt も生成 AI 用の特別なマークアップも使いません。見るのはクロールできるリンク、正規 URL、本文、タイトルです。
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1623] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">クロールとインデックス</h4>
                      <p className="text-xs text-slate-400">robots.txt、noindex、canonical、サイトマップを先に見ます。サイトマップはヒントであり、掲載の保証ではありません。</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1623] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">AIクローラー</h4>
                      <p className="text-xs text-slate-400">robots.txt で生成 AI 向けクローラーを止めているかは参考情報です。検索順位の減点にはしません。</p>
                    </div>
                  </div>

                  <Link 
                    href="/tools/llms-txt"
                    className="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1623] border border-white/[0.06] hover:border-cyan-500/30 transition-all group block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">llms.txt 標準自動生成ツール</h4>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 group-hover:text-cyan-400 transition-all" />
                        </div>
                        <p className="text-xs text-slate-400">llms.txt は他のサービス向けの任意ファイルです。Google 検索の加点にはなりません。</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Refero 16:10 AI Overview Simulator Card */}
              <div id="simulator" className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    サンプル。診断結果ではありません
                  </span>
                  <Link
                    href="#audit-input"
                    className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/20 transition-colors"
                  >
                    URL を入れて診断
                  </Link>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                    <p className="text-xs text-slate-200 leading-relaxed mb-3">
                      <strong>P1:</strong> title がない。タイトルリンクの材料です。文字数の枠では合否を付けません。
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">サンプルの施策です。このサイトの診断結果ではありません。</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 font-mono">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      影響 100 · 数時間
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      引用確率: <strong className="text-slate-300">出さない</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Google API Section */}
        <section id="google-api" className="py-20 border-t border-white/[0.08] bg-[#080B11]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3">GOOGLE OFFICIAL API</h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                連携した Google 公式データ
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                1回の取得では CrUX も Search Console も見ていません。見るのは、アカウントを連携した Google 公式の画面だけです。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider">PageSpeed Insights API</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">v5 REST</span>
                </div>
                <h3 className="text-lg font-bold text-white">Core Web Vitals 実測データ照会</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  実ユーザーの Chrome 測定（CrUX）では、LCP と INP と TTFB をミリ秒で、CLS を単位のない値で見ます。良好の目安は LCP 2.5 秒以内、INP 200 ミリ秒未満、CLS 0.1 未満です。これはフィールドデータで、このサイトの 1 回の取得とは別です。
                </p>
              </div>

              <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Search Console API</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">URL Inspection</span>
                </div>
                <h3 className="text-lg font-bold text-white">Googlebot インデックス公式状態</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Google が保存している前回クロールと、Google が選んだ canonical を返します。その場で再クロールする API ではありません。未連携ならこの画面では空です。
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/google/hub"
                className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-white bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 px-6 py-3 rounded-full transition-all shadow-lg shadow-violet-500/10"
              >
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span>Google公式統合ハブを開く（PageSpeed / Search Console / GA4 / Gemini）</span>
                <ArrowRight className="w-3.5 h-3.5 text-violet-300" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] bg-[#0B0F17] py-16" aria-labelledby="seo-guides-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">SEO GUIDE</p>
                <h2 id="seo-guides-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  SEO改善の手順を理解してから診断する
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  ツールの点数だけでなく、インデックス、canonical、サイトマップ、内部リンクをどう確認するかを実務向けに解説しています。
                </p>
              </div>
              <Link href="/guides" className="text-sm text-cyan-300 hover:text-cyan-200">
                SEOガイド一覧 →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/guides/seo-diagnosis" className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-5 hover:border-cyan-500/30">
                <h3 className="font-semibold text-white">SEO診断のやり方</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">何から確認し、どの順番で修正するかを整理します。</p>
              </Link>
              <Link href="/guides/llms-txt" className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-5 hover:border-cyan-500/30">
                <h3 className="font-semibold text-white">llms.txtとは？</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">役割、作り方、robots.txtやsitemapとの違いを解説します。</p>
              </Link>
              <Link href="/guides/xml-sitemap" className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-5 hover:border-cyan-500/30">
                <h3 className="font-semibold text-white">XMLサイトマップの確認方法</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">URL、lastmod、canonicalの整合を確認する方法をまとめます。</p>
              </Link>
            </div>
          </div>
        </section>

        {/* 6. CTA Footer */}
        <footer className="py-16 border-t border-white/[0.08] bg-[#080B11]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              今すぐ、直す順番を見てみませんか？
            </h2>
            <p className="text-slate-400 text-sm mb-8 max-w-xl mx-auto">
              URLを入力するだけ。クロール、タイトル、構造化データ、HTTPSを見て、直す順番を出します。
            </p>
            <a
              href="#audit-input"
              className="inline-flex items-center gap-2 text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 px-8 py-3.5 rounded-full transition-all shadow-lg shadow-cyan-500/20"
            >
              <span>無料で診断を開始する</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <div className="mt-12 pt-8 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-3">ツール</h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>
                    <a href="#audit-input" className="hover:text-white transition-colors">
                      即時診断（無料。順位は予測しない）
                    </a>
                  </li>
                  <li>
                    <Link href="/tools/llms-txt" className="hover:text-white transition-colors">
                      llms.txt 自動合成・構文検証ツール
                    </Link>
                  </li>
                  <li>
                    <Link href="/tools/sitemap-analyzer" className="hover:text-white transition-colors">
                      XMLサイトマップ解析ツール
                    </Link>
                  </li>
                  <li>
                    <Link href="/crawl/new" className="hover:text-white transition-colors">
                      全URLディープクロール・内部リンク巡回
                    </Link>
                  </li>
                  <li>
                    <Link href="/google/hub" className="hover:text-white transition-colors">
                      Google公式統合ハブ（PageSpeed / Search Console）
                    </Link>
                  </li>
                  <li>
                    <Link href="/guides" className="hover:text-white transition-colors">
                      SEOガイド（診断・llms.txt・XMLサイトマップ）
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider mb-3">サービス・運営情報</h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>
                    <Link href="/about" className="hover:text-white transition-colors">
                      このサイトについて（運営者・OSS開発方針）
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="hover:text-white transition-colors">
                      プライバシーポリシー
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://github.com/nntokyo/seo.n-n.tokyo"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <span>GitHub リポジトリ (MIT License)</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-10 text-xs text-slate-600">
              © 2026 RYO MIURA / SEO Analyzer. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
