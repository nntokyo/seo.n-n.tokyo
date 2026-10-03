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
import { ActionPlan, AuthUser } from '@seo/shared';

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
  actionPlan?: ActionPlan;
  metaDetails: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    robots: string | null;
    ogImage: string | null;
    isUtf8: boolean;
  };
}

export function HomeInteractive() {
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

          <nav className="hidden xl:flex items-center gap-6 text-sm text-slate-400" aria-label="主要ナビゲーション">
            <a href="#audit-input" className="hover:text-white transition-colors">無料診断</a>
            <Link href="/tools" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span>ツール</span>
            </Link>
            <Link href="/google/hub" className="hover:text-violet-300 transition-colors flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
              <span>Google連携</span>
            </Link>
            <Link href="/projects" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
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
              className="hidden xl:inline-flex text-xs font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:brightness-110 px-4 py-2 rounded-full transition-all shadow-md shadow-cyan-500/20"
            >
              即時診断
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="xl:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
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
            className="xl:hidden border-t border-white/[0.08] bg-[#080B11]/95 px-4 py-4 backdrop-blur-xl"
          >
            <div className="mx-auto max-w-7xl space-y-4 text-sm">
              <div>
                <p className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">診断</p>
                <a href="#audit-input" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">SEO総合診断</a>
              </div>
              <div>
                <p className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">分析ツール</p>
                <Link href="/tools" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-cyan-300 hover:bg-white/5">ツール一覧</Link>
                <Link href="/tools/sitemap-analyzer" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">サイトマップ分析</Link>
                <Link href="/crawl/new" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">ディープクロール</Link>
                <Link href="/tools/llms-txt" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">llms.txt生成</Link>
              </div>
              <div>
                <p className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">運用</p>
                <Link href="/google/hub" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">Google連携</Link>
                <Link href="/projects" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-slate-200 hover:bg-white/5">プロジェクト</Link>
              </div>
              <a href="#audit-input" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg bg-cyan-400 px-3 py-2.5 text-center font-semibold text-slate-950">無料診断を開始</a>
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
            <span>クロールからタイトルまで、直す順番で見る</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
            検索に出す前に、<br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
              直す箇所を先に決める。
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-10 leading-relaxed">
            1ページを取得し、クロール、インデックス、タイトル、構造化データ、HTTPSを確認します。点数は作業の順番です。順位やAIの引用は予測しません。
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
                    <span>無料で診断を開始</span>
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
                    AIクローラー
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
                aria-pressed={activeTab === 'overview'}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">TOTAL SCORE</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {auditResult ? `HTTP ${auditResult.httpStatus}` : 'サンプル'}
                  </span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? auditResult.overallScore : '—'}<span className="text-slate-500 text-base font-normal">{auditResult ? '/100' : ''}</span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" aria-hidden="true" /> {auditResult ? '作業順の点数。順位は予測しない' : 'URL を入れると診断します'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="bg-[#0F1623] p-5 text-left cursor-pointer hover:bg-[#131b2e] transition-colors"
                aria-label="この取得の応答時間を表示"
                aria-pressed={activeTab === 'overview'}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">THIS FETCH</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">{auditResult ? '1回の取得' : 'サンプル'}</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? auditResult.responseTimeMs : '—'}<span className="text-slate-500 text-base font-normal">{auditResult ? 'ms' : ''}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {auditResult ? 'LCP でも CrUX でもない' : 'サンプル。実測値ではない'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('aeo')}
                className={`bg-[#0F1623] p-5 text-left cursor-pointer transition-colors ${activeTab === 'aeo' ? 'ring-1 ring-violet-500/50 bg-[#15192c]' : 'hover:bg-[#131b2e]'}`}
                aria-label="AIクローラーの診断を表示"
                aria-pressed={activeTab === 'aeo'}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">AI CRAWLER</span>
                  <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">AI クローラー</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult ? (auditResult.actionPlan?.areas.find((area) => area.id === 'ai')?.score ?? '—') : '—'}<span className="text-slate-500 text-base font-normal">{auditResult?.actionPlan?.areas.find((area) => area.id === 'ai')?.score != null ? '/100' : ''}</span>
                </div>
                <p className="text-xs text-violet-400">
                  {auditResult?.actionPlan?.areas.find((area) => area.id === 'ai')?.score == null ? '未評価。引用は予測しない' : '特別なマークアップは不要'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="bg-[#0F1623] p-5 text-left cursor-pointer transition-colors hover:bg-[#131b2e]"
                aria-label="先に直す P1 の件数を表示"
                aria-pressed={activeTab === 'overview'}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">P1</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">先に直す</span>
                </div>
                <div className="font-mono text-4xl font-extrabold text-white mb-1">
                  {auditResult?.actionPlan ? auditResult.actionPlan.actions.filter((action) => action.priority === 'P1').length : '—'}
                </div>
                <p className="text-xs text-amber-400">
                  {auditResult?.actionPlan ? '詳細は下の施策' : 'URL を入れると出ます'}
                </p>
              </button>
            </div>

            {auditResult?.actionPlan && (
              <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0B101A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300">先に直す施策</span>
                  <Link href={`/audit/${auditResult.id}?url=${encodeURIComponent(auditResult.url)}`} className="text-[11px] font-mono text-cyan-300">
                    スコアカードを開く
                  </Link>
                </div>
                {auditResult.actionPlan.actions.filter((action) => action.severity !== 'info').slice(0, 3).map((action) => (
                  <div key={action.id} className="flex flex-wrap items-baseline gap-2 text-xs">
                    <span className="font-mono text-cyan-300">{action.priority}</span>
                    <span className="text-white">{action.title}</span>
                    <span className="font-mono text-slate-500">影響 {action.impact} · {action.effortLabel}{action.heuristic ? ' · 目安' : ''}</span>
                  </div>
                ))}
                {auditResult.actionPlan.caps[0] && (
                  <p className="text-[11px] text-amber-200/90">{auditResult.actionPlan.caps[0]}</p>
                )}
              </div>
            )}

            {/* Proposal Code / Dynamic Tab Content */}
            <div className="p-6 bg-[#0B101A] border-t border-white/[0.08]">
              {auditResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {activeTab === 'aeo'
                        ? 'AIクローラーと任意の制御'
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
                              m.status === 'notice' ? 'bg-slate-500/10 text-slate-300 border border-slate-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {m.id}
                            </span>
                            <span className="text-sm font-semibold text-white">{m.name}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">{m.status === 'notice' ? '点数にしない' : `${m.score} 点`}</span>
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
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md">P1</span>
                          <span className="text-sm font-semibold text-white">[title_missing] title がない</span>
                        </div>
                        <span className="text-xs font-mono text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                          影響 100 · 数時間
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 font-mono text-xs">
                          <div className="text-red-400 font-bold mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> 検出された現状コード (未設定)
                          </div>
                          <div className="text-slate-400 line-through">
                            &lt;!-- title が空 --&gt;
                          </div>
                          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed font-sans">
                            title はタイトルリンクの材料です。文字数の枠では合否を付けません。
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 font-mono text-xs relative">
                          <div className="text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Next.js App Router 推奨コード
                          </div>
                          <pre className="text-emerald-300 leading-relaxed overflow-x-auto">
{`export const metadata: Metadata = {
  title: 'このページの内容が分かる題名',
  description: '本文より正確に説明できるときだけ書く',
};`}
                          </pre>
                          <button
                            type="button"
                            onClick={() => copyCode(`export const metadata: Metadata = {\n  title: 'このページの内容が分かる題名',\n  description: '本文より正確に説明できるときだけ書く',\n};`)}
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
                          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md">サンプル</span>
                          <span className="text-sm font-semibold text-white">生成 AI の検索に特別なファイルは要りません</span>
                        </div>
                        <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                          引用は予測しない
                        </span>
                      </div>

                      <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-950/10 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          Google 検索は llms.txt も、生成 AI 用の特別なマークアップも使いません。見える本文、クロールできるリンク、正規 URL が先です。llms.txt は他のサービス向けに任意で置けます。
                        </p>
                        <div className="flex items-center gap-3 pt-2 text-xs font-mono text-slate-400">
                          <span>llms.txt: <strong className="text-slate-300">任意。検索の加点ではない</strong></span>
                          <span>引用確率: <strong className="text-slate-300">出さない</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'meta' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">サンプル</span>
                          <span className="text-sm font-semibold text-white">診断前の見本です</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        URL を入れると、取得した canonical と OGP を表示します。この見本に点数も、画像サイズの合格もありません。
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

          </div>
  );
}
