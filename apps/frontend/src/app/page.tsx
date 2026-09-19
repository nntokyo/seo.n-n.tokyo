'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  TrendingUp,
  FileText,
  Copy,
  Check,
  Network,
  FolderKanban,
  User,
  Menu,
  X
} from 'lucide-react';
import { AuthUser } from '@seo/shared';
import { AdSenseUnit } from './_components/AdSenseUnit';

interface AuditResponse {
  id: string;
  url: string;
  httpStatus: number;
  responseTimeMs: number;
  overallScore: number;
  scores: {
    seo: number;
    performance: number;
    meta: number;
    aeo_llmo: number;
  };
  metrics: Array<{
    id: string;
    name: string;
    category: string;
    score: number;
    status: 'good' | 'warning' | 'critical' | 'notice';
    message: string;
    proposal?: string;
    codeDiff?: {
      before: string;
      after: string;
    };
  }>;
  aiOverview: {
    summary: string;
    citations: Array<{ title: string; url: string; domain: string }>;
  };
  metaDetails: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    robots: string | null;
    ogImage: string | null;
    isUtf8: boolean;
  };
}

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'aeo' | 'meta' | 'dom'>('overview');
  const [copied, setCopied] = useState(false);
  const [llmsCopied, setLlmsCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('seo_auth_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsAuditing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/audit/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '診断サーバー通信エラー' }));
        throw new Error(err.message || err.error || 'URLの取得に失敗しました');
      }

      const data = await res.json();
      setAuditResult(data);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`audit_${data.id}`, JSON.stringify(data));
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || '診断中に予期せぬエラーが発生しました');
    } finally {
      setIsAuditing(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Header (Sticky Blur - ShadcnAdmin / Refero) */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#080B11] rounded-[10px] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-base tracking-tight text-white truncate">SEO Analyzer</span>
              <span className="hidden sm:inline-flex text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">v2.0</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">機能</a>
            <Link href="/tools/llms-txt" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-mono text-xs">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>llms.txt生成</span>
            </Link>
            <Link href="/tools/sitemap-analyzer" className="hover:text-sky-400 transition-colors flex items-center gap-1.5 font-mono text-xs">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>サイトマップ分析</span>
            </Link>
            <Link href="/crawl/new" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-mono text-xs">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span>ディープクロール</span>
            </Link>
            <Link href="/google/hub" className="hover:text-violet-400 transition-colors flex items-center gap-1.5 font-mono text-xs text-violet-300">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Google公式統合</span>
            </Link>
            <Link href="/projects" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-mono text-xs">
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
              <span>プロジェクト</span>
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentUser?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="hidden sm:flex text-xs font-mono px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors items-center gap-1.5"
              >
                <span>管理画面</span>
              </Link>
            )}
            {currentUser ? (
              <Link
                href="/account"
                aria-label="マイページ"
                className="text-xs font-mono px-2.5 sm:px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                <span className="hidden sm:inline max-w-40 truncate">{currentUser.name} (マイページ)</span>
              </Link>
            ) : (
              <Link
                href="/login"
                aria-label="ログイン"
                className="text-xs font-mono px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-500/30 bg-white/5 hover:bg-cyan-500/10 text-slate-200 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                <span className="hidden sm:inline">ログイン</span>
              </Link>
            )}
            <a 
              href="#audit-input" 
              className="hidden md:inline-flex text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:brightness-110 px-4 py-2 rounded-full transition-all shadow-md shadow-cyan-500/20"
            >
              即時診断
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              aria-label={mobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="モバイルナビゲーション"
            className="md:hidden border-t border-white/[0.08] bg-[#080B11]/95 px-4 py-4 backdrop-blur-xl"
          >
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-1 text-sm">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">機能</a>
              <Link href="/tools/llms-txt" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">llms.txt生成</Link>
              <Link href="/tools/sitemap-analyzer" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">サイトマップ分析</Link>
              <Link href="/crawl/new" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">ディープクロール</Link>
              <Link href="/google/hub" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">Google公式統合</Link>
              <Link href="/projects" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">プロジェクト</Link>
              <a href="#audit-input" onClick={() => setMobileMenuOpen(false)} className="mt-2 rounded-lg bg-cyan-400 px-3 py-2.5 text-center font-semibold text-slate-950">即時診断へ</a>
            </div>
          </nav>
        )}
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
          <div id="audit-input" className="max-w-2xl mx-auto mb-6">
            <form onSubmit={handleAudit} className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-2xl bg-[#0F1623] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 transition-all">
              <label htmlFor="audit-url" className="sr-only">診断するサイトURL</label>
              <div className="flex min-w-0 flex-1 items-center rounded-xl bg-black/10">
                <div className="pl-3 pr-2 text-slate-500" aria-hidden="true">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  id="audit-url"
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  aria-describedby="audit-url-help"
                  className="min-w-0 w-full bg-transparent py-3 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isAuditing}
                aria-busy={isAuditing}
                className="flex w-full sm:w-auto items-center justify-center gap-2 text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 px-5 py-3 rounded-xl transition-all whitespace-nowrap disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>リアルタイム解析中...</span>
                  </>
                ) : (
                  <>
                    <span>3秒で即時診断</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p id="audit-url-help" className="sr-only">http または https で始まる公開サイトのURLを入力してください。</p>
            <div className="sr-only" aria-live="polite">
              {isAuditing ? 'サイトを診断しています' : auditResult ? '診断が完了しました' : ''}
            </div>

            {errorMsg && (
              <div role="alert" className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 text-left">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> クレジットカード不要</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Google公式API連携</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> llms.txt 自動合成</span>
            </div>
          </div>

          {/* 3. Interactive Hero Dashboard Preview (ShadcnAdmin Border Grid) */}
          <div className="relative rounded-3xl p-1 bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl shadow-cyan-950/40 text-left overflow-hidden mt-8">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/[0.08] bg-[#0F1623]/90">
              <div className="flex min-w-0 items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-1 sm:ml-3 min-w-0 truncate font-mono text-xs text-slate-400">
                  {auditResult ? `audit-live: ${auditResult.url}` : 'audit-preview: https://seo.n-n.tokyo'}
                </span>
              </div>
              <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {auditResult && (
                  <Link
                    href={`/audit/${auditResult.id}?url=${encodeURIComponent(auditResult.url)}`}
                    className="px-3.5 py-1 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-500/20"
                  >
                    <span>詳細レポート</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <div role="tablist" aria-label="診断結果の表示切替" className="grid w-full sm:w-auto grid-cols-3 p-1 rounded-xl sm:rounded-full bg-slate-900 border border-white/10 text-xs">
                  <button 
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    className={`px-2 sm:px-4 py-1.5 rounded-lg sm:rounded-full text-xs font-medium transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    総合診断
                  </button>
                  <button 
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'aeo'}
                    onClick={() => setActiveTab('aeo')}
                    className={`px-2 sm:px-4 py-1.5 rounded-lg sm:rounded-full text-xs font-medium transition-all ${activeTab === 'aeo' ? 'bg-cyan-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    AEO / LLMO
                  </button>
                  <button 
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'meta'}
                    onClick={() => setActiveTab('meta')}
                    className={`px-2 sm:px-4 py-1.5 rounded-lg sm:rounded-full text-xs font-medium transition-all ${activeTab === 'meta' ? 'bg-cyan-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    メタ不具合
                  </button>
                </div>
              </div>
            </div>

            {/* 4連 Border Grid KPI Stat Cards (ShadcnAdmin Spec) */}
            <div className="grid gap-px bg-white/[0.08] grid-cols-2 lg:grid-cols-4 bg-[#080B11]">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`bg-[#0F1623] p-5 text-left cursor-pointer transition-colors ${activeTab === 'overview' ? 'ring-1 ring-cyan-500/50 bg-[#131b2b]' : 'hover:bg-[#131b2e]'}`}
                aria-label="総合診断を表示"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">TOTAL SCORE</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {auditResult ? `${auditResult.httpStatus} OK` : '+12% vs last'}
                  </span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? auditResult.overallScore : 94}<span className="text-slate-500 text-base font-normal">/100</span>
                </div>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" aria-hidden="true" /> Excellent SEO Health
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="bg-[#0F1623] p-5 text-left cursor-pointer hover:bg-[#131b2e] transition-colors"
                aria-label="Core Web Vitalsの概要を表示"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CORE WEB VITALS</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">実測速度</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? auditResult.scores.performance : 98}<span className="text-slate-500 text-base font-normal">/100</span>
                </div>
                <p className="text-xs text-slate-400">
                  {auditResult ? `Response: ${auditResult.responseTimeMs}ms` : 'LCP 1.1s (Good) / INP 45ms'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('aeo')}
                className={`bg-[#0F1623] p-5 text-left cursor-pointer transition-colors ${activeTab === 'aeo' ? 'ring-1 ring-violet-500/50 bg-[#15192c]' : 'hover:bg-[#131b2e]'}`}
                aria-label="AEOとLLMOの診断を表示"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AEO / LLMO READY</span>
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">AI 引用適性</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? auditResult.scores.aeo_llmo : 92}<span className="text-slate-500 text-base font-normal">/100</span>
                </div>
                <p className="text-xs text-violet-400">AI Overviews カルーセル対象</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('meta')}
                className={`bg-[#0F1623] p-5 text-left cursor-pointer transition-colors ${activeTab === 'meta' ? 'ring-1 ring-amber-500/50 bg-[#1c191a]' : 'hover:bg-[#131b2e]'}`}
                aria-label="メタ情報の診断を表示"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">META INTEGRITY</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">メタ整合性</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? auditResult.scores.meta : 88}<span className="text-slate-500 text-base font-normal">/100</span>
                </div>
                <p className="text-xs text-amber-400">Canonical & OGP 整合性</p>
              </button>
            </div>

            {/* Proposal Code / Dynamic Tab Content */}
            <div className="p-6 bg-[#0B101A] border-t border-white/[0.08]">
              {auditResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {activeTab === 'aeo'
                        ? 'AEO / LLMO 関連検査項目'
                        : activeTab === 'meta'
                        ? 'メタタグ・Canonical 検査項目'
                        : `総合診断された検査項目 (${auditResult.metrics.length}件)`}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ターゲット: {auditResult.url}</span>
                  </div>
                  <div className="space-y-3">
                    {auditResult.metrics
                      .filter((m) => {
                        if (activeTab === 'aeo') return m.category === 'aeo_llmo' || m.id.startsWith('AIO');
                        if (activeTab === 'meta') return m.category === 'technical' || m.id.startsWith('META') || m.id.startsWith('CANONICAL');
                        return true;
                      })
                      .map((m, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-white/[0.08] bg-[#0F1623] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              m.status === 'good' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              m.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {m.id}
                            </span>
                            <span className="text-sm font-semibold text-white">{m.name}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">{m.score} 点</span>
                        </div>
                        <p className="text-xs text-slate-400">{m.message}</p>
                        {m.codeDiff && (
                          <div className="mt-2 rounded-lg bg-black/60 p-3 font-mono text-xs text-emerald-300 overflow-x-auto relative">
                            <pre>{m.codeDiff.after}</pre>
                            <button 
                              onClick={() => copyCode(m.codeDiff?.after || '')}
                              className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1"
                            >
                              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Dynamic fallback preview based on active tab */
                <div>
                  {activeTab === 'overview' && (
                    <>
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

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 font-mono text-xs relative">
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
                          <button
                            type="button"
                            onClick={() => copyCode(`export const metadata: Metadata = {\n  robots: {\n    index: true,\n    googleBot: {\n      'max-image-preview': 'large',\n      'max-snippet': -1,\n    },\n  },\n};`)}
                            className="absolute top-3 right-3 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'aeo' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md">AEO / AIO</span>
                          <span className="text-sm font-semibold text-white">Google AI Overviews & SearchGPT 引用確率シミュレーション</span>
                        </div>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                          引用適性スコア: 92点
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-950/10 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          ✨ <strong>AI生成要約プレビュー:</strong> サイト内のh1〜h3階層と結論先行パラグラフをAIが解析し、強調スニペットおよびAI Overviewsの回答カードとしてカルーセル選出される可能性が極めて高い状態です。
                        </p>
                        <div className="flex items-center gap-3 pt-2 text-xs font-mono text-slate-400">
                          <span>llms.txt: <strong className="text-emerald-400">対応可能</strong></span>
                          <span>ファクト密度: <strong className="text-cyan-400">88% (高)</strong></span>
                          <span>定義文構造: <strong className="text-emerald-400">適合</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'meta' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">META DEFECT</span>
                          <span className="text-sm font-semibold text-white">Canonical & OGP 整合性プレビュー</span>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          整合性: 88点
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-4 rounded-xl border border-white/10 bg-[#0F1623] space-y-2">
                          <div className="text-slate-400 font-bold">検出された正規化タグ</div>
                          <div className="text-cyan-300 break-all">rel="canonical" href="https://seo.n-n.tokyo"</div>
                          <div className="text-emerald-400 text-[11px]">✅ Self-canonical 正常一致</div>
                        </div>

                        <div className="p-4 rounded-xl border border-white/10 bg-[#0F1623] space-y-2">
                          <div className="text-slate-400 font-bold">OGP / ソーシャル設定</div>
                          <div className="text-slate-200">og:title, og:description, twitter:card (設定済み)</div>
                          <div className="text-emerald-400 text-[11px]">✅ 1200x630 サムネイル比率準拠</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AdSenseUnit />

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
              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">AEO / AIO / LLMO / GEO 最適化</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Google AI Overviews、SearchGPT、Perplexityでの自社サイト引用確率を判定。AIが抜き出しやすい定義文構造・ファクト密度を自動スコアリングします。
              </p>
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>詳細仕様とllms.txt生成</span>
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
              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">Google 公式 API 完全統合</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                PageSpeed Insights (v5) によるCore Web Vitals実測値、およびSearch Console URL InspectionによるGooglebot公式インデックス状態を直接照会。
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
              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">サイトマップ & ハブ・カノニカル分析</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                XMLサイトマップの構文検証からトピッククラスター親ハブ特定、hreflang/AMP対URL、非正規化パラメータ混入まで一括精密診断。
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
                      <p className="text-xs text-slate-400">AIモデルがサイト情報を効率的に把握するための公式Markdown仕様（/llms.txt）をワンクリック合成。</p>
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
                  Google AI Overviews 引用シミュレータ
                </span>
                <Link
                  href="#audit-input"
                  className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/20 transition-colors"
                >
                  リアルタイム再現
                </Link>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                  <p className="text-xs text-slate-200 leading-relaxed mb-3">
                    ✨ <strong>AI生成要約:</strong> {auditResult ? auditResult.aiOverview.summary : 'SEO Analyzerは、Core Web VitalsやCanonicalタグの整合性を自動診断するエンジニア向けプラットフォームです。AIが引用しやすい結論ファースト構文をサポートしています。'}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <div className="p-2.5 rounded-xl bg-[#080B11] border border-white/10 shrink-0 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 font-bold">NN</div>
                      <div>
                        <div className="text-[11px] font-bold text-white">{auditResult ? new URL(auditResult.url).hostname : 'seo.n-n.tokyo'}</div>
                        <div className="text-[9px] text-slate-500">機能と仕様書...</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 font-mono">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    AIクローラー: <strong className="text-emerald-400">全許可 (200 OK)</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    スニペット: <strong className="text-emerald-400">max-snippet:-1</strong>
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
              Google公式データによる絶対的な客観性と信頼性
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              サードパーティの推計値ではなく、Googleが実際に保有するCrUX実測データベースとSearch ConsoleインデックスAPIに直結して診断します。
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
                実ユーザーのChrome測定データ（Chrome User Experience Report）からLCP、INP、CLS、TTFBをミリ秒単位で抽出。75パーセンタイル値での合格判定を実施します。
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Search Console API</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">URL Inspection</span>
              </div>
              <h3 className="text-lg font-bold text-white">Googlebot インデックス公式状態</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Googlebotが前回クロールした日時、レンダリング成功可否、検出されたCanonicalとGoogleが選択したCanonicalの差異をリアルタイム照会します。
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
          <div className="mt-12 pt-8 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
            <div>
              <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-3">SEO・AEO 解析ツール</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#audit-input" className="hover:text-white transition-colors">
                    100項目即時SEO・AI引用診断（無料）
                  </a>
                </li>
                <li>
                  <Link href="/tools/llms-txt" className="hover:text-white transition-colors">
                    llms.txt 自動合成・構文検証ツール
                  </Link>
                </li>
                <li>
                  <Link href="/tools/sitemap-analyzer" className="hover:text-white transition-colors">
                    XMLサイトマップ & カノニカル解析ツール
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
  );
}
