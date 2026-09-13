'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Bot, 
  Cpu, 
  Layers, 
  Code2, 
  Zap,
  Activity,
  Terminal,
  ExternalLink,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'aeo' | 'meta' | 'dom'>('overview');

  const handleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Header (Sticky Blur - ShadcnAdmin / Refero) */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#080B11] rounded-[10px] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">SEO Analyzer</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">v2.0</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">機能</a>
            <a href="#aeo-llmo" className="hover:text-white transition-colors">AEO / LLMO / GEO</a>
            <a href="#google-api" className="hover:text-white transition-colors">Google公式API</a>
            <a href="#simulator" className="hover:text-white transition-colors">AI表示シミュレータ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors">
              ログイン
            </button>
            <a 
              href="#audit-input" 
              className="text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:brightness-110 px-4 py-2 rounded-full transition-all shadow-md shadow-cyan-500/20"
            >
              無料で診断開始
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (High Impact Terminal & Cyber Glow) */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/20 to-violet-600/20 blur-[120px] pointer-events-none -z-10 rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>次世代検索の新基準: AEO・AIO・LLMO・GEO に完全対応</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
            Google検索でも、AI回答でも。<br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
              あなたのサイトが最も引用される。
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-10 leading-relaxed">
            150項目以上の技術的SEO、Core Web Vitals実測値、およびGoogle AI Overviews / SearchGPT / Perplexityでの引用適性を3秒で精密診断。Next.js App Router対応の修正コードを自動生成します。
          </p>

          {/* Quick Audit Input Bar */}
          <div id="audit-input" className="max-w-2xl mx-auto mb-12">
            <form onSubmit={handleAudit} className="relative flex items-center p-2 rounded-2xl bg-[#0F1623] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 transition-all">
              <div className="pl-3 pr-2 text-slate-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com を入力して無料診断..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAuditing}
                className="flex items-center gap-2 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 px-5 py-3 rounded-xl transition-all whitespace-nowrap disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>解析中...</span>
                  </>
                ) : (
                  <>
                    <span>3秒で即時診断</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> クレジットカード不要</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Google公式API連携</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> llms.txt 自動合成</span>
            </div>
          </div>

          {/* 3. Interactive Hero Dashboard Preview (ShadcnAdmin Border Grid) */}
          <div className="relative rounded-3xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl shadow-cyan-950/40 text-left overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0F1623]/90">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 font-mono text-xs text-slate-400">audit-preview: https://seo.n-n.tokyo</span>
              </div>
              <div className="inline-flex p-1 rounded-full bg-slate-900 border border-white/10 text-xs">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  総合診断
                </button>
                <button 
                  onClick={() => setActiveTab('aeo')}
                  className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${activeTab === 'aeo' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  AEO / LLMO
                </button>
                <button 
                  onClick={() => setActiveTab('meta')}
                  className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${activeTab === 'meta' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  メタ不具合
                </button>
                <button 
                  onClick={() => setActiveTab('dom')}
                  className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${activeTab === 'dom' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  DOM差分
                </button>
              </div>
            </div>

            {/* 4連 Border Grid KPI Stat Cards (ShadcnAdmin Spec) */}
            <div className="grid gap-px bg-white/[0.08] grid-cols-2 lg:grid-cols-4 bg-[#080B11]">
              <div className="bg-[#0F1623] p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">TOTAL SCORE</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">+12% vs last</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">94<span className="text-slate-500 text-base font-normal">/100</span></div>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Excellent SEO Health
                </p>
              </div>

              <div className="bg-[#0F1623] p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CORE WEB VITALS</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">CrUX 実測</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">98<span className="text-slate-500 text-base font-normal">/100</span></div>
                <p className="text-xs text-slate-400">LCP 1.1s (Good) / INP 45ms</p>
              </div>

              <div className="bg-[#0F1623] p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AEO / LLMO READY</span>
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">引用確率 88%</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">92<span className="text-slate-500 text-base font-normal">/100</span></div>
                <p className="text-xs text-violet-400">AI Overviews カルーセル対象</p>
              </div>

              <div className="bg-[#0F1623] p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">META INTEGRITY</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">1 Warning</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">88<span className="text-slate-500 text-base font-normal">/100</span></div>
                <p className="text-xs text-amber-400">Canonical正常 / OGP微修正</p>
              </div>
            </div>

            {/* Proposal Code Split View (Before / After) */}
            <div className="p-6 bg-[#0B101A] border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md">CRITICAL</span>
                  <span className="text-sm font-semibold text-white">[AIO-001] AIスニペット最大表示メタタグの付与推奨</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  獲得見込み: +15点
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 font-mono text-xs">
                  <div className="text-red-400 font-bold mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> 検出された現状コード (未設定)
                  </div>
                  <div className="text-slate-400 line-through">
                    &lt;!-- max-snippet タグが存在しません --&gt;
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400 leading-relaxed font-sans">
                    ⚠️ AI Overviewsや検索スニペットで要約が省略され、サムネイル画像が表示されない危険があります。
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 font-mono text-xs">
                  <div className="text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Next.js App Router 推奨コード
                  </div>
                  <pre className="text-emerald-300 leading-relaxed overflow-x-auto">
{`export const metadata: Metadata = {
  robots: {
    index: true,
    googleBot: {
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">AEO / AIO / LLMO / GEO 最適化</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Google AI Overviews、SearchGPT、Perplexityでの自社サイト引用確率を判定。AIが抜き出しやすい定義文構造・ファクト密度を自動スコアリングします。
              </p>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                <span>llms.txt 自動合成対応</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Google 公式 API 完全統合</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                PageSpeed Insights (v5) によるCore Web Vitals実測値、およびSearch Console URL InspectionによるGooglebot公式インデックス状態を直接照会。
              </p>
              <div className="text-xs font-mono text-violet-400 flex items-center gap-1">
                <span>CrUX & GSC連携</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Raw HTML vs Rendered DOM 差分</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                静的HTMLとPlaywright描画後のDOMを並列比較。JavaScriptによる遅延Canonical注入やSSRハイドレーションエラーを可視化します。
              </p>
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span>JS SEO 完全監査</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
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
                <span>AI時代の新標準 Web規格</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                SEOの次は、<br />
                AEO / AIO / LLMO / GEO です。
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                検索エンジンだけでなく、自律型AIエージェントやLLMがWebを巡回してユーザーに回答を提示する現代。自社サイトが「AIに選ばれる構造」になっているかどうかがビジネスの命運を分けます。
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1623] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">AEO (Answer Engine Optimization)</h4>
                    <p className="text-xs text-slate-400">Google強調スニペットやSiri/Alexaの音声ダイレクト回答枠を独占するための構文診断。</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1623] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">AIO & LLMO</h4>
                    <p className="text-xs text-slate-400">Google AI Overviews や ChatGPT Search でのインライン引用・カルーセル掲載確率をスコアリング。</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#0F1623] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">llms.txt 標準自動生成</h4>
                    <p className="text-xs text-slate-400">AIモデルがサイト情報を効率的に把握するための公式Markdown仕様（/llms.txt）をワンクリック合成。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Refero 16:10 AI Overview Simulator Card */}
            <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Google AI Overviews 引用シミュレータ
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">リアルタイム再現</span>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                  <p className="text-xs text-slate-200 leading-relaxed mb-3">
                    ✨ <strong>AI生成要約:</strong> SEO Analyzerは、Core Web VitalsやCanonicalタグの整合性を自動診断するエンジニア向けプラットフォームです。AIが引用しやすい結論ファースト構文をサポートしています。
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <div className="p-2.5 rounded-xl bg-[#080B11] border border-white/10 shrink-0 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 font-bold">NN</div>
                      <div>
                        <div className="text-[11px] font-bold text-white">seo.n-n.tokyo</div>
                        <div className="text-[9px] text-slate-500">機能と仕様書...</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#080B11] border border-white/10 shrink-0 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] text-violet-400 font-bold">DOC</div>
                      <div>
                        <div className="text-[11px] font-bold text-white">公式ガイド</div>
                        <div className="text-[9px] text-slate-500">AEO/LLMO対応...</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <span>AIクローラー対応: <strong className="text-emerald-400">全許可 (200 OK)</strong></span>
                  <span>スニペット制限: <strong className="text-emerald-400">max-snippet:-1</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Footer */}
      <footer className="py-16 border-t border-white/[0.08] bg-[#080B11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            今すぐ、あなたのサイトのSEOとAI表示を診断しませんか？
          </h2>
          <p className="text-slate-400 text-sm mb-8 max-w-xl mx-auto">
            URLを入力するだけ。100項目以上の精密監査レポートと修正コードを即座に確認できます。
          </p>
          <a
            href="#audit-input"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 px-8 py-3.5 rounded-full transition-all shadow-lg shadow-cyan-500/20"
          >
            <span>無料で診断を開始する</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <div className="mt-12 text-xs text-slate-600">
            © 2026 合同会社NN (seo.n-n.tokyo). All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
