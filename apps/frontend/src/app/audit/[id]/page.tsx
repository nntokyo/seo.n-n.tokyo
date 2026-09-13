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
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { FullAuditResult, AuditMetric } from '@seo/shared';

export default function AuditDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [audit, setAudit] = useState<FullAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'aeo' | 'meta' | 'diff' | 'links'>('metrics');
  const [metricFilter, setMetricFilter] = useState<'all' | 'critical' | 'warning' | 'good'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const fetchAuditResult = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/audit/results/${id}`);
      if (!res.ok) {
        throw new Error('診断結果が見つからないか、期限切れです。トップページから再診断を行ってください。');
      }
      const data = await res.json();
      setAudit(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'データ取得エラーが発生しました');
    } finally {
      setIsLoading(false);
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
      <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 space-y-5">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <p className="text-sm font-semibold">{errorMsg || '診断データが見つかりません'}</p>
        </div>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>トップへ戻って再診断</span>
        </Link>
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
  const goodCount = audit.metrics.filter((m) => m.status === 'good').length;

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
            <button
              onClick={fetchAuditResult}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">再読み込み</span>
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
        {/* KPI Strip (Border Grid - ShadcnAdmin) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Score */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-mono text-slate-400">総合スコア</span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  audit.overallScore >= 80 ? 'text-emerald-400' : audit.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {audit.overallScore}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{audit.httpStatus} OK</span>
            </div>
          </div>

          {/* Technical SEO */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-mono text-slate-400">テクニカルSEO</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-white">{audit.scores.seo}</span>
              <span className="text-xs text-slate-500">点</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Title / Canonical</span>
          </div>

          {/* Core Web Vitals */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-mono text-slate-400">パフォーマンス (TTFB)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-cyan-400">{audit.responseTimeMs}</span>
              <span className="text-xs text-slate-500">ms</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">サイズ: {audit.cwv.totalSizeKb} KB</span>
          </div>

          {/* AEO / LLMO */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-mono text-slate-400">AEO / AI引用適性</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-violet-400">{audit.scores.aeo_llmo}</span>
              <span className="text-xs text-slate-500">点</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">回答抽出性: {audit.aiOverview.answerabilityScore}%</span>
          </div>

          {/* Meta Integrity */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-mono text-slate-400">メタデータ整合性</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-white">{audit.scores.meta}</span>
              <span className="text-xs text-slate-500">点</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">OGP / Twitter Card</span>
          </div>

          {/* Security */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
            <span className="text-[11px] font-mono text-slate-400">セキュリティ & SSL</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-400">{audit.scores.security}</span>
              <span className="text-xs text-slate-500">点</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">TLS 1.3 / HTTPS</span>
          </div>
        </div>

        {/* Pill Navigation Tabs (Refero Styles) */}
        <div className="border-b border-white/[0.08] pb-1 flex items-center gap-2 overflow-x-auto">
          <button
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
            onClick={() => setActiveTab('aeo')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === 'aeo'
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Overviews & AEO</span>
          </button>

          <button
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
        </div>

        {/* Tab 1: All Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0F17] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500 mr-2">重要度:</span>
                <button
                  onClick={() => setMetricFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  すべて ({audit.metrics.length})
                </button>
                <button
                  onClick={() => setMetricFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-red-400/80 hover:text-red-400'}`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  onClick={() => setMetricFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-amber-400/80 hover:text-amber-400'}`}
                >
                  Warning ({warningCount})
                </button>
                <button
                  onClick={() => setMetricFilter('good')}
                  className={`px-2.5 py-1 rounded-lg ${metricFilter === 'good' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-emerald-400/80 hover:text-emerald-400'}`}
                >
                  Pass ({goodCount})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">カテゴリ:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">全カテゴリ</option>
                  <option value="technical">テクニカル / Meta</option>
                  <option value="content">コンテンツ / 見出し</option>
                  <option value="aeo_llmo">AEO / AI Overviews</option>
                  <option value="cwv">Core Web Vitals</option>
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
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {m.status}
                      </span>
                      <span className="text-xs font-mono text-slate-500">{m.id}</span>
                      <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400 font-bold">{m.score} 点</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{m.message}</p>

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
            {/* AI Mockup Card */}
            <div className="p-6 rounded-2xl border border-violet-500/30 bg-[#0B0F17] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-violet-400">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    Google AI Overviews (AIO) 引用シミュレーター
                  </span>
                </div>
                <span className="text-[11px] font-mono text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
                  回答抽出率: {audit.aiOverview.answerabilityScore}%
                </span>
              </div>

              <div className="p-5 rounded-xl bg-violet-950/20 border border-violet-500/20 space-y-3">
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  ✨ <strong>AI生成ダイレクト要約:</strong> {audit.aiOverview.summary}
                </p>

                <div className="pt-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">参照・引用ソース (Citations):</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {audit.aiOverview.citations.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#080B11] border border-white/10 flex items-center gap-2 text-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-white truncate max-w-[180px]">{c.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">{c.domain}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-white font-mono">AEO / LLMO 最適化推奨アクション:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {audit.aiOverview.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold mt-0.5">#{idx + 1}</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Meta Inspector */}
        {activeTab === 'meta' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-white">検出された主要メタタグ一覧</h3>
                <span className="text-xs font-mono text-slate-400">文字セット: {audit.meta.charset || 'UTF-8'}</span>
              </div>

              <div className="divide-y divide-white/[0.06] text-xs font-mono">
                {/* Title */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">&lt;title&gt;</div>
                  <div className="md:col-span-2 text-white break-all font-sans">{audit.meta.title || '(未設定)'}</div>
                  <div className="text-right text-slate-500">{audit.meta.title ? `${audit.meta.title.length} 文字` : '0 文字'}</div>
                </div>

                {/* Description */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">description</div>
                  <div className="md:col-span-2 text-white break-all font-sans">{audit.meta.description || '(未設定)'}</div>
                  <div className="text-right text-slate-500">{audit.meta.description ? `${audit.meta.description.length} 文字` : '0 文字'}</div>
                </div>

                {/* Canonical */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">canonical</div>
                  <div className="md:col-span-3 text-cyan-400 break-all">{audit.meta.canonical || '(未設定)'}</div>
                </div>

                {/* Robots */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="text-slate-400 font-bold">robots</div>
                  <div className="md:col-span-3 text-white">{audit.meta.robots || audit.meta.googlebot || '(デフォルト: index, follow)'}</div>
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
                以下のコードを <code className="text-cyan-300 font-mono">src/app/layout.tsx</code> または <code className="text-cyan-300 font-mono">src/app/page.tsx</code> に貼り付けることで、Title、Canonical、AIO max-snippet、OGP の不具合が一括解決されます。
              </p>

              <div className="relative rounded-xl bg-black/60 p-4 font-mono text-xs text-emerald-300 border border-white/[0.06] overflow-x-auto">
                <pre>{`import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${audit.meta.title || 'サイトタイトル'}',
  description: '${audit.meta.description || 'サイトの要約説明'}',
  alternates: {
    canonical: '${audit.meta.canonical || audit.url}',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: '${audit.meta.ogTitle || audit.meta.title || 'サイトタイトル'}',
    description: '${audit.meta.ogDescription || audit.meta.description || 'サイトの要約説明'}',
    url: '${audit.url}',
    siteName: '${new URL(audit.url).hostname}',
    images: [
      {
        url: '${audit.meta.ogImage || 'https://' + new URL(audit.url).hostname + '/og-image.png'}',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${audit.meta.ogTitle || audit.meta.title || 'サイトタイトル'}',
    description: '${audit.meta.ogDescription || audit.meta.description || 'サイトの要約説明'}',
  },
};`}</pre>
                <button
                  onClick={() =>
                    copyCode(
                      `export const metadata: Metadata = {\n  title: '${audit.meta.title || 'サイトタイトル'}',\n};`,
                      'next-metadata'
                    )
                  }
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
      </main>
    </div>
  );
}
