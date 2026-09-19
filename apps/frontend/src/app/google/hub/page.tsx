'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Globe,
  ArrowLeft,
  Activity,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Bot,
  Sparkles,
  Zap,
  Layers,
  LineChart,
  Users,
  Search,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ChevronRight,
  TrendingUp,
  Clock,
  Eye,
  MousePointerClick,
  Code2,
  Copy,
  Check,
  Info
} from 'lucide-react';
import {
  GoogleHubDataResponse,
  GoogleSessionStatus,
  PsiCruxData,
  GscAnalyticsData,
  Ga4MetricsData,
  GeminiProposalData
} from '@seo/shared';

function GoogleHubContent() {
  const searchParams = useSearchParams();
  const [targetUrl, setTargetUrl] = useState('https://seo.n-n.tokyo');
  const [sessionStatus, setSessionStatus] = useState<GoogleSessionStatus>({ isConnected: false });
  const [hubData, setHubData] = useState<GoogleHubDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'psi' | 'gsc' | 'ga4' | 'gemini'>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // GoogleセッションIDはHttpOnly Cookie内に保持し、JavaScriptへ公開しない。
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setErrorMsg(`Google認証エラー: ${decodeURIComponent(err)}`);
    }

    checkSessionStatus();

    // 初回自動データ取得 (デフォルトURL)
    fetchHubData('https://seo.n-n.tokyo');
  }, [searchParams]);

  // セッション状態照会
  const checkSessionStatus = async () => {
    try {
      const res = await fetch('/api/v1/integrations/google/session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSessionStatus(data);
      }
    } catch {}
  };

  // Google OAuth開始
  const handleConnectGoogle = async () => {
    setIsAuthenticating(true);
    try {
      const res = await fetch('/api/v1/integrations/google/auth-url');
      if (!res.ok) throw new Error('認証URLの取得に失敗しました');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'OAuth認証開始エラー');
      setIsAuthenticating(false);
    }
  };

  // Google連携解除
  const handleDisconnect = async () => {
    if (!confirm('このブラウザに保存されたGoogle連携情報・トークンを完全に削除しますか？')) return;
    try {
      await fetch('/api/v1/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {}
    setSessionStatus({ isConnected: false });
    // データ再取得 (未連携状態)
    fetchHubData(targetUrl);
  };

  // 統合データ取得
  const fetchHubData = async (urlToFetch: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    let norm = urlToFetch.trim();
    if (!norm.startsWith('http://') && !norm.startsWith('https://')) {
      norm = `https://${norm}`;
    }

    try {
      const res = await fetch('/api/v1/google/hub-data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: norm,
        }),
      });

      if (!res.ok) {
        throw new Error('Google公式統合データの取得に失敗しました');
      }

      const data: GoogleHubDataResponse = await res.json();
      setHubData(data);
      if (data.session) {
        setSessionStatus(data.session);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'データ取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHubData(targetUrl);
  };

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const psi = hubData?.psi;
  const gsc = hubData?.gsc;
  const ga4 = hubData?.ga4;
  const gemini = hubData?.gemini;
  const webRisk = hubData?.webRisk;

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* 1. Header (Refero Sticky Style) */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>トップに戻る</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white tracking-tight">
                Google 公式API統合ハブ
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10">
                SCR-27
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sessionStatus.isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[150px]">{sessionStatus.userEmail || 'Google連携中'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-1.5 transition-colors"
                  title="このブラウザの連携情報を解除"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">連携解除</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isAuthenticating}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110 text-xs font-bold text-white font-mono flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition-all disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isAuthenticating ? 'Googleへ移動中...' : 'Googleアカウントで連携'}</span>
              </button>
            )}

            <Link
              href="/tools/sitemap-analyzer"
              className="hidden md:flex px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>サイトマップ分析</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner: Browser Scoped Isolation & Privacy */}
        <div className="p-4 rounded-2xl border border-violet-500/20 bg-[#0F1623] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold text-white">ブラウザー分離セキュリティ:</span>{' '}
              <span className="text-slate-400">
                本システムのGoogle連携（Search Console / GA4）は、現在のブラウザ環境（セッションID）にのみ隔離保持されます。他の利用者から検索クエリやトラフィックデータが閲覧されることは一切ありません。
              </span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 shrink-0">
            {sessionStatus.isConnected ? '✅ 独立セッション保護中' : '⚠️ 未認証（公開データのみ表示）'}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-2 rounded-2xl bg-[#0F1623] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 transition-all">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="pl-3 pr-2 text-slate-500">
              <Globe className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com を入力してGoogle公式データを照会..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 transition-all whitespace-nowrap disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Google照会中...</span>
                </>
              ) : (
                <>
                  <span>公式データ取得</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {(webRisk || hubData?.errors.webRisk) && (
          <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            webRisk?.isThreat
              ? 'bg-red-950/40 border-red-500/30 text-red-300'
              : webRisk
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900/50 border-white/10 text-slate-400'
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {webRisk
                ? webRisk.isThreat
                  ? `Google Web Riskで脅威を検出: ${webRisk.threatTypes.join(', ')}`
                  : 'Google Web Riskでは、このURLの既知の脅威は検出されませんでした。'
                : hubData?.errors.webRisk}
            </span>
          </div>
        )}

        {/* 4連 KPI Strip (Border Grid - ShadcnAdmin) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08] rounded-3xl overflow-hidden border border-white/[0.08] bg-[#080B11]">
          {/* PSI Performance */}
          <div className="bg-[#0F1623] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">PageSpeed (PSI)</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                psi ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
              }`}>
                {psi ? 'CrUX実測' : '未取得'}
              </span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-white mb-1">
              {psi ? psi.performanceScore : '--'}<span className="text-slate-500 text-base font-normal">/100</span>
            </div>
            <p className="text-xs text-cyan-400 font-mono truncate">
              {psi ? `LCP: ${psi.lcp.value}ms / TTFB: ${psi.ttfb.value}ms` : '未取得 (APIキーまたは診断実行待ち)'}
            </p>
          </div>

          {/* GSC Clicks & Impressions */}
          <div className="bg-[#0F1623] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">Search Console (28d)</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                gsc ? 'text-violet-400 bg-violet-500/10' : 'text-slate-500 bg-slate-800'
              }`}>
                {gsc ? '公式クエリ' : '未取得'}
              </span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-white mb-1">
              {gsc ? gsc.totalClicks.toLocaleString() : '--'}<span className="text-slate-500 text-base font-normal"> clicks</span>
            </div>
            <p className="text-xs text-violet-400 font-mono truncate">
              {gsc ? `表示: ${gsc.totalImpressions.toLocaleString()} / CTR: ${gsc.averageCtr}%` : '未取得 (OAuth未連携または権限なし)'}
            </p>
          </div>

          {/* GA4 Active Users */}
          <div className="bg-[#0F1623] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">GA4 Users (28d)</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                ga4 ? 'text-sky-400 bg-sky-500/10' : 'text-slate-500 bg-slate-800'
              }`}>
                {ga4 ? 'アナリティクス' : '未取得'}
              </span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-white mb-1">
              {ga4 ? ga4.activeUsers.toLocaleString() : '--'}<span className="text-slate-500 text-base font-normal"> users</span>
            </div>
            <p className="text-xs text-sky-400 font-mono truncate">
              {ga4 ? `PV: ${ga4.screenPageViews.toLocaleString()} / E.R.: ${ga4.engagementRate}%` : '未取得 (OAuth未連携またはGA4未設定)'}
            </p>
          </div>

          {/* Gemini AI Optimization */}
          <div className="bg-[#0F1623] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">Gemini AI提案</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">2.5 Flash</span>
            </div>
            <div className="font-mono text-3xl font-extrabold text-white mb-1">
              {gemini ? gemini.actionItems.length : '--'}<span className="text-slate-500 text-base font-normal"> 件の改善案</span>
            </div>
            <p className="text-xs text-emerald-400 font-mono truncate">
              {gemini ? '公式実測値に基づく提案生成済' : '未取得'}
            </p>
          </div>
        </div>

        {/* Navigation Filter Tabs */}
        <div className="border-b border-white/[0.08] pb-1 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>全データ統合ビュー</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('psi')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'psi'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PageSpeed & CrUX {psi ? `(${psi.performanceScore}点)` : '(未取得)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gsc')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'gsc'
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Console {gsc ? `(${gsc.topQueries.length}クエリ)` : '(未取得)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ga4')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'ga4'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>GA4 トラフィック {ga4 ? `(${ga4.activeUsers}人)` : '(未取得)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'gemini'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini 具体的改善案</span>
          </button>
        </div>

        {/* SECTION 1: PageSpeed Insights & CrUX */}
        {(activeTab === 'all' || activeTab === 'psi') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>1. Google PageSpeed Insights & CrUX 実測値</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Lighthouse v5 Engine (Mobile Strategy)
              </span>
            </div>

            {psi ? (
              <div className="space-y-4">
                {/* 5大指標カード */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[psi.lcp, psi.fcp, psi.cls, psi.inp, psi.ttfb].map((metric, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 truncate block">{metric.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-extrabold font-mono ${
                          metric.status === 'good' ? 'text-emerald-400' :
                          metric.status === 'needs_improvement' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {metric.value}
                        </span>
                        <span className="text-xs text-slate-500">{metric.unit}</span>
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold inline-block ${
                        metric.status === 'good' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        metric.status === 'needs_improvement' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {metric.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 改善機会 (Opportunities) */}
                {psi.opportunities.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/[0.08] bg-black/20 text-xs font-mono font-bold text-white">
                      Lighthouse 検出改善機会 ({psi.opportunities.length}件)
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                      {psi.opportunities.map((opp, idx) => (
                        <div key={idx} className="p-4 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{opp.title}</span>
                            {opp.savingsBytes && (
                              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                -{Math.round(opp.savingsBytes / 1024)} KB 削減見込み
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{opp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-white/10 bg-[#0F1623] text-center space-y-2">
                <div className="text-xs font-mono text-amber-400">⚠️ PageSpeed 診断データ: 未取得</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {hubData?.errors.psi || 'APIキーが未設定か、Google PageSpeedサーバーからの応答待機中です。画面上部の「公式データ取得」を再試行してください。'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: Google Search Console */}
        {(activeTab === 'all' || activeTab === 'gsc') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Search className="w-4 h-4 text-violet-400" />
                <span>2. Google Search Console (検索クエリ & インデックス状況)</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                直近28日間の集計
              </span>
            </div>

            {gsc ? (
              <div className="space-y-4">
                {gsc.opportunitySummary && (
                  <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" aria-labelledby="gsc-opportunities-heading">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 id="gsc-opportunities-heading" className="text-sm font-bold text-white">SEO改善候補</h4>
                        <p className="mt-1 text-xs text-slate-400">
                          Search Console実データから、次に改善する候補をルールベースで抽出しています。
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-300">High {gsc.opportunitySummary.high}</span>
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">Medium {gsc.opportunitySummary.medium}</span>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-slate-300">Total {gsc.opportunitySummary.total}</span>
                      </div>
                    </div>

                    {gsc.opportunities.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {gsc.opportunities.slice(0, 8).map((opportunity) => {
                          const typeLabel = {
                            ctr_opportunity: 'CTR改善',
                            striking_distance: '順位押し上げ',
                            zero_click: '表示あり・クリック0',
                            cannibalization: 'カニバリゼーション',
                            indexing_issue: 'インデックス',
                          }[opportunity.type];
                          return (
                            <div key={opportunity.id} className="rounded-xl border border-white/[0.08] bg-[#0F1623] p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  opportunity.priority === 'high'
                                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                    : opportunity.priority === 'medium'
                                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                      : 'border-white/10 bg-white/5 text-slate-300'
                                }`}>
                                  {opportunity.priority}
                                </span>
                                <span className="text-[10px] font-mono text-cyan-300">{typeLabel}</span>
                                {opportunity.query && <strong className="text-xs text-white">「{opportunity.query}」</strong>}
                              </div>

                              <p className="mt-2 text-xs leading-6 text-slate-300">{opportunity.reason}</p>
                              {(opportunity.impressions !== undefined || opportunity.position !== undefined) && (
                                <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-mono text-slate-500">
                                  {opportunity.impressions !== undefined && <span>表示 {opportunity.impressions.toLocaleString()}</span>}
                                  {opportunity.clicks !== undefined && <span>クリック {opportunity.clicks.toLocaleString()}</span>}
                                  {opportunity.ctr !== undefined && <span>CTR {opportunity.ctr}%</span>}
                                  {opportunity.position !== undefined && <span>平均順位 {opportunity.position}</span>}
                                </div>
                              )}
                              {opportunity.pages && opportunity.pages.length > 0 && (
                                <div className="mt-2 space-y-1 text-[10px] font-mono text-slate-500">
                                  {opportunity.pages.map((page) => <div key={page} className="truncate">{page}</div>)}
                                </div>
                              )}
                              <p className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-[11px] leading-5 text-slate-400">
                                推奨: {opportunity.recommendedAction}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-xs text-slate-500">
                        現在の28日データでは、閾値を満たす明確な改善候補はありません。表示回数が少ない場合はデータ蓄積を待って再確認してください。
                      </p>
                    )}
                  </section>
                )}

                {/* インデックス判定ステータス */}
                {gsc.indexStatus && (
                  <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        gsc.indexStatus.verdict === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {gsc.indexStatus.verdict}
                      </span>
                      <span className="text-white">{gsc.indexStatus.coverageState}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                      <span>robots.txt: <strong className="text-emerald-400">{gsc.indexStatus.robotsTxtState}</strong></span>
                      <span>インデックス権限: <strong className="text-cyan-400">{gsc.indexStatus.indexingState}</strong></span>
                    </div>
                  </div>
                )}

                {/* 上位流入クエリ一覧テーブル */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.08] bg-black/20 text-xs font-mono font-bold text-white flex items-center justify-between">
                    <span>上位検索クエリ ({gsc.topQueries.length}件)</span>
                    <span className="text-[11px] text-slate-500">照会プロパティ: {gsc.siteUrl}</span>
                  </div>
                  <div className="divide-y divide-white/[0.06] text-xs font-mono">
                    <div className="px-4 py-2 text-slate-500 grid grid-cols-12 text-[10px] uppercase tracking-wider">
                      <div className="col-span-6">検索クエリ</div>
                      <div className="col-span-2 text-right">クリック数</div>
                      <div className="col-span-2 text-right">表示回数</div>
                      <div className="col-span-1 text-right">CTR</div>
                      <div className="col-span-1 text-right">平均順位</div>
                    </div>
                    {gsc.topQueries.map((q, idx) => (
                      <div key={idx} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-white/[0.02]">
                        <div className="col-span-6 font-semibold text-white truncate flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 w-4">{idx + 1}.</span>
                          <span className="truncate">{q.query}</span>
                        </div>
                        <div className="col-span-2 text-right text-violet-400 font-bold">{q.clicks.toLocaleString()}</div>
                        <div className="col-span-2 text-right text-slate-300">{q.impressions.toLocaleString()}</div>
                        <div className="col-span-1 text-right text-cyan-400">{q.ctr}%</div>
                        <div className="col-span-1 text-right text-amber-400">{q.position} 位</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-white/10 bg-[#0F1623] text-center space-y-3">
                <div className="text-xs font-mono text-amber-400">⚠️ Search Console データ: 未取得</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {hubData?.errors.gsc || 'Googleアカウントが未連携です。連携することで自社サイトの流入キーワード、順位、インデックス状態が自動表示されます。'}
                </p>
                {!sessionStatus.isConnected && (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold font-mono text-white inline-flex items-center gap-2 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Googleアカウントを接続する</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Google Analytics 4 */}
        {(activeTab === 'all' || activeTab === 'ga4') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span>3. Google Analytics 4 (GA4 実トラフィック集計)</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Analytics Data API v1beta
              </span>
            </div>

            {ga4 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1">
                  <span className="text-[10px] text-slate-400">アクティブユーザー</span>
                  <div className="text-2xl font-bold text-sky-400">{ga4.activeUsers.toLocaleString()}</div>
                  <span className="text-[9px] text-slate-500">直近28日間</span>
                </div>
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1">
                  <span className="text-[10px] text-slate-400">セッション数</span>
                  <div className="text-2xl font-bold text-white">{ga4.sessions.toLocaleString()}</div>
                  <span className="text-[9px] text-slate-500">訪問回数</span>
                </div>
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1">
                  <span className="text-[10px] text-slate-400">スクリーンPV</span>
                  <div className="text-2xl font-bold text-white">{ga4.screenPageViews.toLocaleString()}</div>
                  <span className="text-[9px] text-slate-500">ページビュー</span>
                </div>
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1">
                  <span className="text-[10px] text-slate-400">エンゲージメント率</span>
                  <div className="text-2xl font-bold text-emerald-400">{ga4.engagementRate}%</div>
                  <span className="text-[9px] text-emerald-500/80">有効セッション比</span>
                </div>
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-1">
                  <span className="text-[10px] text-slate-400">直帰率 (Bounce)</span>
                  <div className="text-2xl font-bold text-amber-400">{ga4.bounceRate}%</div>
                  <span className="text-[9px] text-slate-500">即離脱率</span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-white/10 bg-[#0F1623] text-center space-y-3">
                <div className="text-xs font-mono text-amber-400">⚠️ GA4 データ: 未取得</div>
                <div className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed whitespace-pre-line">
                  {hubData?.errors.ga4 || 'Google Analytics 4プロパティが未設定か、アカウント連携が行われていません。'}
                </div>
                {hubData?.errors.ga4?.includes('console.developers.google.com') && (
                  <div className="pt-2">
                    <a
                      href="https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=205539062628"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-xs font-mono text-violet-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Google Cloud Console で API を有効化</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {!sessionStatus.isConnected && (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold font-mono text-white inline-flex items-center gap-2 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Googleアカウントを接続する</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: Gemini AI Fix Proposals */}
        {(activeTab === 'all' || activeTab === 'gemini') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>4. Gemini 3.8 Flash 改善提案 & タイトルリライト</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Google公式データを入力にした生成AI提案
              </span>
            </div>

            {gemini ? (
              <div className="space-y-4">
                {gemini.jevValidation && (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs">
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-violet-300">Jev validation</span>
                      <span className="text-slate-300">判定: <strong>{gemini.jevValidation.action}</strong></span>
                      <span className="text-slate-400">Confidence: {Math.round(gemini.jevValidation.confidence * 100)}%</span>
                      <span className="text-slate-400">SEO回帰確率: {Math.round(gemini.jevValidation.seoRegressionProbability * 100)}%</span>
                    </div>
                    <p className="mt-2 text-slate-400">
                      生成結果の参考検証です。自動適用や既存のGoogle/Gemini結果の破棄には使用しません。
                    </p>
                  </div>
                )}

                {/* 要約・診断サマリー */}
                <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    💡 <strong>総合サマリー:</strong> {gemini.summary}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                    {gemini.strengths.map((str, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-[#080B11] text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{str}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 具体的アクションアイテム一覧 */}
                <div className="space-y-3">
                  {gemini.actionItems.map((item, idx) => (
                    <div key={idx} className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            item.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {item.priority} priority
                          </span>
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                        </div>
                        <span className="text-xs font-mono text-emerald-400">{item.impact}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{item.suggestion}</p>

                      {item.codeSnippet && (
                        <div className="relative mt-2 rounded-xl bg-black/60 p-4 font-mono text-xs text-emerald-300 border border-white/[0.06] overflow-x-auto">
                          <pre>{item.codeSnippet}</pre>
                          <button
                            type="button"
                            onClick={() => copyCode(item.codeSnippet || '', idx)}
                            className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 transition-colors"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedIndex === idx ? 'Copied' : 'Copy Code'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* CTR改善用 タイトルリライト提案 (3案) */}
                {gemini.titleProposals.length > 0 && (
                  <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-3">
                    <h4 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                      <span>検索結果クリック率（CTR）向上のためのタイトル案</span>
                    </h4>
                    <div className="space-y-2">
                      {gemini.titleProposals.map((t, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">案 {idx + 1}</span>
                            <span className="text-white truncate font-medium">{t}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyCode(t, 100 + idx)}
                            className="shrink-0 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-colors"
                          >
                            {copiedIndex === 100 + idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedIndex === 100 + idx ? 'Copied' : 'コピー'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-white/10 bg-[#0F1623] text-center space-y-2">
                <div className="text-xs font-mono text-slate-400">Gemini 改善提案: 診断実行待ち</div>
                <p className="text-xs text-slate-500">URLを入力して「公式データ取得」を押すとAI提案が生成されます。</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function GoogleHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-400 rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">Google公式統合ハブを読み込み中...</p>
      </div>
    }>
      <GoogleHubContent />
    </Suspense>
  );
}
