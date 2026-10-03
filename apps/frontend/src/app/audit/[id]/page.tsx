'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Globe,
  Layers,
  Link2,
  Map,
  FileText,
  FolderTree,
  Split,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
  Printer,
} from 'lucide-react';
import { FullAuditResult, AuditMetric } from '@seo/shared';
import { ActionPlanPanel } from '../../../components/ActionPlanPanel';
import { metricPointLabel } from '../../../components/metric-point';

export default function AuditDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [audit, setAudit] = useState<FullAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'aeo' | 'meta' | 'diff' | 'links' | 'sitemap'>('metrics');
  const [metricFilter, setMetricFilter] = useState<'all' | 'critical' | 'warning' | 'notice' | 'good'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [inlineUrl, setInlineUrl] = useState('');
  const [isReauditing, setIsReauditing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const fetchAuditResult = async (forceReload = false) => {
    if (!id) return;
    if (forceReload) {
      setIsReloading(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    // 1. 強制リロード時でなければブラウザの sessionStorage を確認
    if (!forceReload && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`audit_${id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAudit(parsed);
          setIsLoading(false);
          return;
        } catch {}
      }
    }

    if (forceReload && typeof window !== 'undefined') {
      try { sessionStorage.removeItem(`audit_${id}`); } catch {}
    }

    // 2. URLクエリパラメータの取得 (auto-recovery用)
    const queryUrl = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('url')
      : null;

    try {
      const targetUrl = audit?.url || queryUrl;

      // forceReload の場合は即座に最新URLでクイック診断を実行して完全更新
      if (forceReload && targetUrl) {
        const refreshRes = await fetch('/api/v1/audit/quick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });
        if (refreshRes.ok) {
          const freshData = await refreshRes.json();
          setAudit(freshData);
          if (typeof window !== 'undefined') {
            try { sessionStorage.setItem(`audit_${id}`, JSON.stringify(freshData)); } catch {}
          }
          return;
        }
      }

      const endpoint = queryUrl
        ? `/api/v1/audit/results/${id}?url=${encodeURIComponent(queryUrl)}`
        : `/api/v1/audit/results/${id}`;
      const res = await fetch(endpoint);

      if (!res.ok) {
        // 3. クエリURLがあれば即座にクイック診断を実行して復旧
        if (queryUrl) {
          const autoRes = await fetch('/api/v1/audit/quick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: queryUrl }),
          });
          if (autoRes.ok) {
            const autoData = await autoRes.json();
            setAudit(autoData);
            if (typeof window !== 'undefined') {
              try { sessionStorage.setItem(`audit_${id}`, JSON.stringify(autoData)); } catch {}
            }
            return;
          }
        }
        throw new Error('診断結果が見つからないか、有効期限が切れています。下記からURLを入力して再診断を行ってください。');
      }

      const data = await res.json();
      setAudit(data);
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(`audit_${id}`, JSON.stringify(data)); } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'データ取得エラーが発生しました');
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  };

  const handleInlineReaudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineUrl) return;
    setIsReauditing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/audit/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inlineUrl }),
      });
      if (!res.ok) {
        throw new Error('URLの診断に失敗しました。URLを確認してください。');
      }
      const data = await res.json();
      setAudit(data);
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(`audit_${id}`, JSON.stringify(data)); } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || '診断エラー');
    } finally {
      setIsReauditing(false);
    }
  };

  useEffect(() => {
    fetchAuditResult();
  }, [id]);

  const copyCode = (code: string, codeId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(codeId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">診断レポートを読み込み中...</p>
      </div>
    );
  }

  if (errorMsg || !audit) {
    return (
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 space-y-6">
        <div className="p-6 rounded-2xl bg-[#0B0F17] border border-white/10 max-w-lg w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">診断レポートが見つかりません</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMsg || 'サーバー再起動または有効期限によりキャッシュが更新されました。URLを入力して即座に最新診断を実行できます。'}
            </p>
          </div>

          {/* インライン再診断フォーム */}
          <form onSubmit={handleInlineReaudit} className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              value={inlineUrl}
              onChange={(e) => setInlineUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isReauditing || !inlineUrl}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors disabled:opacity-50"
            >
              {isReauditing ? '診断中...' : '再診断'}
            </button>
          </form>

          <div className="pt-2 border-t border-white/[0.06]">
            <Link
              href="/"
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>トップページへ戻る</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredMetrics = audit.metrics.filter((m) => {
    if (metricFilter !== 'all' && m.status !== metricFilter) return false;
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    return true;
  });

  const criticalCount = audit.metrics.filter((m) => m.status === 'critical').length;
  const warningCount = audit.metrics.filter((m) => m.status === 'warning').length;
  const noticeCount = audit.metrics.filter((m) => m.status === 'notice').length;
  const goodCount = audit.metrics.filter((m) => m.status === 'good').length;
  const jsString = (value: string) => JSON.stringify(value.replace(/\s+/g, ' ').trim().slice(0, 500));
  const metadataLines = [
    '// この取得で見えた値だけです。無かった項目は書いていません。',
    "import type { Metadata } from 'next';",
    '',
    'export const metadata: Metadata = {',
  ];
  if (audit.meta.title) metadataLines.push(`  title: ${jsString(audit.meta.title)},`);
  if (audit.meta.description) metadataLines.push(`  description: ${jsString(audit.meta.description)},`);
  if (audit.meta.canonical) {
    metadataLines.push('  alternates: {', `    canonical: ${jsString(audit.meta.canonical)},`, '  },');
  }
  if (audit.meta.robots) {
    metadataLines.push(
      '  robots: {',
      `    index: ${/noindex/i.test(audit.meta.robots) ? 'false' : 'true'},`,
      `    follow: ${/nofollow/i.test(audit.meta.robots) ? 'false' : 'true'},`,
      '  },',
    );
  }
  const openGraph = [
    audit.meta.ogTitle ? `    title: ${jsString(audit.meta.ogTitle)},` : '',
    audit.meta.ogDescription ? `    description: ${jsString(audit.meta.ogDescription)},` : '',
    audit.meta.canonical ? `    url: ${jsString(audit.meta.canonical)},` : '',
    audit.meta.ogImage ? `    images: [{ url: ${jsString(audit.meta.ogImage)} }],` : '',
  ].filter(Boolean);
  if (openGraph.length > 0) metadataLines.push('  openGraph: {', ...openGraph, '  },');
  const twitter = [
    audit.meta.twitterCard ? `    card: ${jsString(audit.meta.twitterCard)},` : '',
    audit.meta.ogTitle ? `    title: ${jsString(audit.meta.ogTitle)},` : '',
    audit.meta.ogDescription ? `    description: ${jsString(audit.meta.ogDescription)},` : '',
  ].filter(Boolean);
  if (twitter.length > 0) metadataLines.push('  twitter: {', ...twitter, '  },');
  metadataLines.push('};');
  const metadataSample = metadataLines.join('\n');
  const p1Count = audit.actionPlan?.actions.filter((action) => action.priority === 'P1').length ?? 0;
  const fixCount = audit.actionPlan?.actions.filter((action) => action.severity !== 'info').length ?? 0;
  const fetchedOk = audit.httpStatus >= 200 && audit.httpStatus < 300;

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
              <span>トップ</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 overflow-hidden">
              <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs font-mono text-white truncate max-w-[240px] sm:max-w-md">
                {audit.url}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/reports/${audit.id}`}
              target="_blank"
              aria-label="PDFとして保存"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
              title="PDFとして保存・印刷"
            >
              <Printer className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">PDF保存</span>
            </Link>
            <Link
              href={`/google/hub?url=${encodeURIComponent(audit.url)}`}
              aria-label="Google公式連携"
              className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-xs font-mono text-violet-300 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3 h-3 text-violet-400" />
              <span className="hidden sm:inline">Google公式連携</span>
            </Link>
            <button
              type="button"
              disabled={isReloading}
              onClick={() => fetchAuditResult(true)}
              aria-label={isReloading ? '再診断中' : '再読み込み'}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isReloading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isReloading ? '再診断中...' : '再読み込み'}</span>
            </button>
            <Link
              href="/tools/llms-txt"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-xs font-mono text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <Bot className="w-3 h-3" />
              <span>llms.txt</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {audit.jevShadow && (
          <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-300" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-white">Jev shadow evaluation</h2>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-mono text-violet-300">
                    advisory only
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  既存ルールのスコアやseverityは変更せず、AI判断を参考情報として並行評価しています。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono sm:grid-cols-5">
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-slate-300">評価 {audit.jevShadow.evaluatedCount}件</span>
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-cyan-300">Gemini候補 {audit.jevShadow.geminiCandidateCount}件</span>
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-amber-300">低信頼 {audit.jevShadow.lowConfidenceCount}件</span>
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-slate-300">平均 {Math.round(audit.jevShadow.averageConfidence * 100)}%</span>
                <span className="rounded-lg bg-black/20 px-2.5 py-1.5 text-slate-300">{audit.jevShadow.latencyMs}ms</span>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] space-y-2">
            <span className="text-[11px] font-mono text-slate-400">総合</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-white">{audit.overallScore}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">作業順の点数。順位や引用は予測しない</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] space-y-2">
            <span className="text-[11px] font-mono text-slate-400">HTTP</span>
            <div className={`text-3xl font-extrabold font-mono ${fetchedOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {audit.httpStatus}
            </div>
            <p className="text-[10px] font-mono text-slate-400">{fetchedOk ? 'HTML を取得できた' : 'この URL は取得できていない'}</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] space-y-2">
            <span className="text-[11px] font-mono text-slate-400">この1回の応答</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-cyan-300">{audit.responseTimeMs}</span>
              <span className="text-xs text-slate-500">ms</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">HTML {audit.cwv.totalSizeKb} KB。LCP や CrUX ではない</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] space-y-2">
            <span className="text-[11px] font-mono text-slate-400">先に直す</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-white">{audit.actionPlan ? p1Count : '—'}</span>
              <span className="text-xs text-slate-500">P1</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              {audit.actionPlan ? `減点する施策 ${fixCount} 件` : 'この保存結果には施策一覧がない'}
            </p>
          </div>
        </div>

        {audit.actionPlan && <ActionPlanPanel plan={audit.actionPlan} url={audit.url} />}

        {/* Pill Navigation Tabs (Refero Styles) */}
        <div className="border-b border-white/[0.08] pb-1 flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="診断の表示">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'metrics'}
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>全診断項目 ({audit.metrics.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'aeo'}
            onClick={() => setActiveTab('aeo')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'aeo'
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AIクローラー</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'meta'}
            onClick={() => setActiveTab('meta')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'meta'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>メタタグインスペクター</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'diff'}
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'diff'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>修正コード提案</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'links'}
            onClick={() => setActiveTab('links')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'links'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>内部/外部リンク ({audit.links.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sitemap'}
            onClick={() => setActiveTab('sitemap')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'sitemap'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>XMLサイトマップ {audit.sitemap ? `(${audit.sitemap.totalUrls})` : ''}</span>
          </button>
        </div>

        {/* Tab 1: All Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0F17] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500 mr-2">重要度:</span>
                <button
                  type="button"
                  aria-pressed={metricFilter === 'all'}
                  onClick={() => setMetricFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  すべて ({audit.metrics.length})
                </button>
                <button
                  type="button"
                  aria-pressed={metricFilter === 'critical'}
                  onClick={() => setMetricFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-red-400/80 hover:text-red-400'}`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  type="button"
                  aria-pressed={metricFilter === 'warning'}
                  onClick={() => setMetricFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-amber-400/80 hover:text-amber-400'}`}
                >
                  Warning ({warningCount})
                </button>
                <button
                  type="button"
                  aria-pressed={metricFilter === 'notice'}
                  onClick={() => setMetricFilter('notice')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'notice' ? 'bg-slate-500/20 text-slate-200 border border-slate-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Notice ({noticeCount})
                </button>
                <button
                  type="button"
                  aria-pressed={metricFilter === 'good'}
                  onClick={() => setMetricFilter('good')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'good' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-emerald-400/80 hover:text-emerald-400'}`}
                >
                  Pass ({goodCount})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">カテゴリ:</span>
                <select
                  aria-label="カテゴリ"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">全カテゴリ</option>
                  <option value="technical">テクニカル / Meta</option>
                  <option value="content">コンテンツ / 見出し</option>
                  <option value="aeo_llmo">AIクローラー / 任意の制御</option>
                  <option value="cwv">この1回の応答</option>
                  <option value="security">セキュリティ</option>
                </select>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-3">
              {filteredMetrics.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] hover:border-white/20 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                          m.status === 'critical'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : m.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : m.status === 'notice'
                            ? 'bg-slate-500/10 text-slate-300 border-slate-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {m.status}
                      </span>
                      <span className="text-xs font-mono text-slate-500">{m.id}</span>
                      <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400 font-bold">{metricPointLabel(m.status, m.score)}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{m.message}</p>

                  {m.aiDecision && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[11px] font-mono">
                      <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-violet-300">
                        Jev shadow
                      </span>
                      <span className="text-slate-400">
                        AI優先度: <strong className="text-slate-200">{m.aiDecision.priority}</strong>
                      </span>
                      <span className="text-slate-400">
                        Confidence: <strong className="text-slate-200">{Math.round(m.aiDecision.confidence * 100)}%</strong>
                      </span>
                      <span className="text-slate-400">
                        回帰リスク: <strong className="text-slate-200">{m.aiDecision.regressionRisk.toFixed(1)}/2</strong>
                      </span>
                      <span className={m.aiDecision.shouldGenerateWithGemini ? 'text-cyan-300' : 'text-slate-500'}>
                        Gemini個別生成: {m.aiDecision.shouldGenerateWithGemini ? '候補' : '低優先'}
                      </span>
                    </div>
                  )}

                  {m.proposal && (
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300 leading-relaxed">
                      💡 <strong>改善案:</strong> {m.proposal}
                    </div>
                  )}

                  {m.codeDiff && (
                    <div className="relative mt-2 rounded-xl bg-black/60 p-4 font-mono text-xs text-emerald-300 border border-white/[0.06] overflow-x-auto">
                      <pre>{m.codeDiff.after}</pre>
                      <button
                        onClick={() => copyCode(m.codeDiff?.after || '', m.id)}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 transition-colors"
                      >
                        {copiedCodeId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCodeId === m.id ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: AEO & AI Overviews */}
        {activeTab === 'aeo' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-violet-500/30 bg-[#0B0F17] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-violet-300">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    取得したページのメモ
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                  引用は予測しない
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{audit.aiOverview.summary}</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Google 検索は llms.txt も、生成 AI 用の特別なマークアップも使いません。下のリンクはこのページと、HTML から読めた内部リンクです。引用元ではありません。
              </p>
              <ul className="space-y-2">
                {audit.aiOverview.citations.map((item) => (
                  <li key={item.url} className="text-xs">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 break-all hover:text-cyan-200">
                      {item.title || item.url}
                    </a>
                  </li>
                ))}
              </ul>
              {audit.aiOverview.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono text-slate-300">先に直すこと</h3>
                  <ol className="list-decimal space-y-2 pl-4 text-xs text-slate-300">
                    {audit.aiOverview.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ol>
                  <a href="#action-plan" className="inline-block text-[11px] font-mono text-cyan-300">施策一覧へ</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Meta Inspector */}
        {activeTab === 'meta' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-white">検出された主要メタタグ一覧</h3>
                <span className="text-xs font-mono text-slate-400">文字数は合否ではない</span>
              </div>

              <div className="divide-y divide-white/[0.06] text-xs font-mono">
                {/* Title */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">&lt;title&gt;</div>
                  <div className="md:col-span-2 text-white break-all font-sans">{audit.meta.title || '(未設定)'}</div>
                  <div className="text-right text-slate-500">{audit.meta.title ? `${audit.meta.title.length} 文字` : '—'}</div>
                </div>

                {/* Description */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">description</div>
                  <div className="md:col-span-2 text-white break-all font-sans">{audit.meta.description || '(未設定)'}</div>
                  <div className="text-right text-slate-500">{audit.meta.description ? `${audit.meta.description.length} 文字` : '—'}</div>
                </div>

                {/* Canonical */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">canonical</div>
                  <div className="md:col-span-3 text-cyan-400 break-all">{audit.meta.canonical || '(未設定)'}</div>
                </div>

                {/* Robots */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">robots</div>
                  <div className="md:col-span-3 text-white">
                    {audit.meta.robots || '未設定'}
                    {!audit.meta.robots && <span className="text-slate-500">（タグが無ければ Google の初期値は index, follow）</span>}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">googlebot</div>
                  <div className="md:col-span-3 text-white">{audit.meta.googlebot || '未設定'}</div>
                </div>

                {/* OGP Image */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">og:image</div>
                  <div className="md:col-span-3 text-cyan-400 break-all">{audit.meta.ogImage || '(未設定)'}</div>
                </div>

                {/* Twitter Card */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">twitter:card</div>
                  <div className="md:col-span-3 text-white">{audit.meta.twitterCard || '(未設定)'}</div>
                </div>

                {/* Viewport */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">viewport</div>
                  <div className="md:col-span-3 text-white">{audit.meta.viewport || '(未設定)'}</div>
                </div>

                {/* Schema Types */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">JSON-LD Schemas</div>
                  <div className="md:col-span-3 text-emerald-400">
                    {audit.meta.schemaTypes.length > 0 ? audit.meta.schemaTypes.join(', ') : '(未設定)'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Code Diff Proposals */}
        {activeTab === 'diff' && (
          <div className="space-y-5">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0F17] space-y-4">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-cyan-400" />
                <span>Next.js App Router (metadata) 推奨設定コード</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                公開したいページ向けの例です。noindex のページには貼らないでください。title と description は、この取得で見えた文字列を置いただけです。文字数の枠や max-snippet の未設定は不具合ではありません。
              </p>

              <div className="relative rounded-xl bg-black/60 p-4 font-mono text-xs text-emerald-300 border border-white/[0.06] overflow-x-auto">
                <pre>{metadataSample}</pre>
                <button
                  type="button"
                  onClick={() => copyCode(metadataSample, 'next-metadata')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedCodeId === 'next-metadata' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCodeId === 'next-metadata' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Discovered Links */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-white">
                  検出されたページ内リンク一覧 ({audit.links.length}件)
                </h3>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span>内部: {audit.links.filter((l) => l.isInternal).length}件</span>
                  <span>外部: {audit.links.filter((l) => !l.isInternal).length}件</span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06] max-h-[520px] overflow-y-auto">
                {audit.links.length > 0 ? (
                  audit.links.map((link, idx) => (
                    <div key={idx} className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 ${
                            link.isInternal
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          }`}
                        >
                          {link.isInternal ? '内部' : '外部'}
                        </span>
                        <div className="truncate">
                          <div className="font-semibold text-white truncate">{link.anchorText}</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">{link.url}</div>
                        </div>
                      </div>

                      {link.isNofollow && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                          nofollow
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono">
                    ページ内リンクが見つかりませんでした。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: XML Sitemap Inspector */}
        {activeTab === 'sitemap' && (
          <div className="space-y-6">
            {audit.sitemap ? (
              <>
                {/* Sitemap Top Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                    <span className="text-[11px] font-mono text-slate-400">サイトマップ状態</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border uppercase ${
                          audit.sitemap.status === 'found'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : audit.sitemap.status === 'not_found'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {audit.sitemap.status === 'found'
                          ? '✅ 有効 (200 OK)'
                          : audit.sitemap.status === 'not_found'
                          ? '⚠️ 未検出 (404)'
                          : '🚨 エラー'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {audit.sitemap.sitemapUrl || 'sitemap.xml 不在'}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                    <span className="text-[11px] font-mono text-slate-400">登録URL総数</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-sky-400">
                        {audit.sitemap.totalUrls.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500">件</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {audit.sitemap.isSitemapIndex ? 'Sitemap Index 形式' : '標準 urlset 形式'} (上限: 50,000件)
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                    <span className="text-[11px] font-mono text-slate-400">robots.txt 連携</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border uppercase ${
                          audit.sitemap.hasRobotsTxtSitemap
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {audit.sitemap.hasRobotsTxtSitemap ? 'Sitemap 行あり' : 'Sitemap 行は無い'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">サイトマップは発見のヒントです。クロールも掲載も保証しません</span>
                  </div>

                  <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                    <span className="text-[11px] font-mono text-slate-400">ファイル容量 & 応答</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold font-mono text-white">
                        {audit.sitemap.xmlSizeKb} KB
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ({audit.sitemap.responseTimeMs}ms)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">上限: 50 MB</span>
                  </div>
                </div>

                {/* Hub Clusters & Canonical Companion Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Hub Clusters */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                        <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                        <span>ハブ & トピッククラスター分析</span>
                      </h4>
                      <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                        {audit.sitemap.analytics?.hubClusters?.length ?? 0} クラスター
                      </span>
                    </div>
                    {audit.sitemap.analytics?.hubClusters && audit.sitemap.analytics.hubClusters.length > 0 ? (
                      <div className="space-y-2.5">
                        {audit.sitemap.analytics.hubClusters.map((cluster, cIdx) => (
                          <div key={cIdx} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-violet-300 font-bold">{cluster.hubPath} (ハブ親URL)</span>
                              <span className="text-[10px] text-slate-400">{cluster.childPageCount} ページ</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{cluster.hubUrl}</div>
                            {cluster.sampleChildren.length > 0 && (
                              <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                                {cluster.sampleChildren.slice(0, 2).map((ch, sIdx) => (
                                  <div key={sIdx} className="truncate flex items-center gap-1 text-slate-400">
                                    <span className="text-slate-600">↳</span>
                                    <span className="truncate">{ch}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-mono py-4 text-center">
                        明確なディレクトリ別ハブ構造は検出されませんでした。
                      </p>
                    )}
                  </div>

                  {/* Canonical & Companion Summary */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <h4 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                        <Split className="w-3.5 h-3.5 text-sky-400" />
                        <span>サイトマップ URL の内訳</span>
                      </h4>
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        canonical は未確認
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-slate-400 text-[10px]">utm_ / session / filter を含まない URL</span>
                        <div className="text-base font-bold text-emerald-400">
                          {audit.sitemap.analytics?.canonicalCompanion ? audit.sitemap.analytics.canonicalCompanion.selfCanonicalCount : '—'} 件
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">canonical は読んでいません。</p>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-slate-400 text-[10px]">utm_ / session / filter を含む URL</span>
                        <div className={`text-base font-bold ${
                          (audit.sitemap.analytics?.canonicalCompanion?.potentialCanonicalConflictCount ?? 0) > 0 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {audit.sitemap.analytics?.canonicalCompanion ? audit.sitemap.analytics.canonicalCompanion.potentialCanonicalConflictCount : '—'} 件
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-slate-400 text-[10px]">Hreflang 多言語対URL</span>
                        <div className="text-base font-bold text-sky-400">
                          {audit.sitemap.analytics?.canonicalCompanion ? audit.sitemap.analytics.canonicalCompanion.hreflangCount : '—'} 件
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-slate-400 text-[10px]">モバイル/AMP 対URL</span>
                        <div className="text-base font-bold text-violet-400">
                          {audit.sitemap.analytics?.canonicalCompanion ? audit.sitemap.analytics.canonicalCompanion.ampCount : '—'} 件
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <Link
                        href="/tools/sitemap-analyzer"
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      >
                        <span>サイトマップ精密分析ツールで詳細を確認</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Sitemap Issues / Alerts */}
                {audit.sitemap.issues.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>サイトマップ検出課題・警告 ({audit.sitemap.issues.length}件)</span>
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      {audit.sitemap.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                            issue.severity === 'critical'
                              ? 'bg-red-500/10 border-red-500/20 text-red-300'
                              : issue.severity === 'warning'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                          }`}
                        >
                          <span className="shrink-0 font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-black/40">
                            {issue.severity}
                          </span>
                          <div className="space-y-1">
                            <p className="font-semibold text-white">{issue.message}</p>
                            {issue.proposal && (
                              <p className="text-[11px] opacity-80 font-mono">💡 推奨: {issue.proposal}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sitemap URL List */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold text-white">
                      サイトマップ登録URL一覧 (最大先頭100件 / 全 {audit.sitemap.totalUrls}件)
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Format: {audit.sitemap.isSitemapIndex ? 'Sitemap Index' : 'URLset'}
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.06] max-h-[440px] overflow-y-auto">
                    {audit.sitemap.urls.length > 0 ? (
                      audit.sitemap.urls.map((entry, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between gap-4 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="text-slate-500 text-[10px] w-6 text-right shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="text-slate-200 truncate">{entry.loc}</span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 text-[11px] text-slate-400">
                            {entry.lastmod && <span>更新: {entry.lastmod.split('T')[0]}</span>}
                            {entry.changefreq && <span>頻度: {entry.changefreq}</span>}
                            {entry.priority && <span>優先度: {entry.priority}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs font-mono">
                        有効なURLエントリがサイトマップ内に見つかりませんでした。
                      </div>
                    )}
                  </div>
                </div>

                {/* Next.js App Router Recommended Code */}
                {audit.sitemap.generatedNextjsCode && (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-sky-400" />
                        <h3 className="text-xs font-mono font-bold text-white">
                          取得した URL だけの例 (app/sitemap.ts)
                        </h3>
                      </div>
                      <button
                        onClick={() => copyCode(audit.sitemap!.generatedNextjsCode!, 'sitemap_code')}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedCodeId === 'sitemap_code' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>コードをコピー</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 bg-black/60 font-mono text-xs text-sky-300 overflow-x-auto">
                      <pre>{audit.sitemap.generatedNextjsCode}</pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Map className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">サイトマップ検証データがありません</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    この診断が実行された時点ではサイトマップ情報が保存されていません。下のボタンまたはヘッダーから最新の診断を実行してください。
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isReloading}
                    onClick={() => fetchAuditResult(true)}
                    className="px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-xs font-mono text-sky-400 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                    <span>{isReloading ? 'サイトマップ再診断中...' : 'サイトマップを最新状態で再読み込み'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
