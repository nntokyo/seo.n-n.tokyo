'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Map,
  Sparkles,
  ArrowLeft,
  Activity,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Clock,
  ShieldCheck,
  Code2,
  Copy,
  Check,
  Layers,
  ChevronRight,
  ExternalLink,
  Split,
  FolderTree,
  FileCheck
} from 'lucide-react';
import { SitemapValidationResult, AuditMetric } from '@seo/shared';

interface AnalyzeOutcome {
  sitemapResult: SitemapValidationResult;
  metric: AuditMetric;
}

export default function SitemapAnalyzerPage() {
  const [targetUrl, setTargetUrl] = useState('https://seo.n-n.tokyo');
  const [outcome, setOutcome] = useState<AnalyzeOutcome | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    let norm = targetUrl.trim();
    if (!norm.startsWith('http://') && !norm.startsWith('https://')) {
      norm = `https://${norm}`;
    }

    try {
      const res = await fetch('/api/v1/tools/validate-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: norm }),
      });

      if (!res.ok) {
        throw new Error('サイトマップの解析・検証に失敗しました');
      }

      const data = await res.json();
      setOutcome(data);
    } catch (err: any) {
      setErrorMsg(err.message || '解析中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sitemap = outcome?.sitemapResult;

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
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
              <Map className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-bold text-white tracking-tight">
                XMLサイトマップ & ハブページ・カノニカル分析
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-400 bg-sky-500/10">
                Deep Analyzer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tools/llms-txt"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-xs font-mono text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>llms.txt生成</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Intro */}
        <div className="max-w-3xl space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            XMLサイトマップ、ハブページ、コンパニオンURL精密解析
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            サイトマップのXML構文や到達性だけでなく、<strong>トピックハブ（親カテゴリ）と子ページ群のクラスタリング構造</strong>、<strong>Canonical（正規化）整合性</strong>、および<strong>多言語・AMPコンパニオンURL</strong>の相互連携を網羅的に分析します。
          </p>
        </div>

        {/* Input Bar */}
        <div className="p-2 rounded-2xl bg-[#0F1623] border border-white/10 shadow-2xl focus-within:border-sky-500/50 transition-all max-w-3xl">
          <form onSubmit={handleAnalyze} className="flex items-center gap-2">
            <div className="pl-3 pr-2 text-slate-500">
              <Globe className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com を入力..."
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 text-xs font-semibold text-black bg-sky-400 hover:bg-sky-300 px-5 py-3 rounded-xl transition-all whitespace-nowrap disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>サイトマップ解析中...</span>
                </>
              ) : (
                <>
                  <span>精密分析を実行</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2 max-w-3xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results */}
        {sitemap && (
          <div className="space-y-8">
            {/* KPI Cards (Border Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-mono text-slate-400">サイトマップ状態</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border uppercase ${
                      sitemap.status === 'found'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : sitemap.status === 'not_found'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {sitemap.status === 'found' ? '✅ 有効 (200 OK)' : sitemap.status === 'not_found' ? '⚠️ 未検出 (404)' : '🚨 エラー'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {sitemap.sitemapUrl || 'sitemap.xml 不在'}
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-mono text-slate-400">登録URL総数</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-sky-400">
                    {sitemap.totalUrls.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">件</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {sitemap.isSitemapIndex ? 'Sitemap Index 形式' : '標準 urlset 形式'}
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-mono text-slate-400">ハブ・トピッククラスタ</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-violet-400">
                    {sitemap.analytics?.hubClusters?.length ?? 0}
                  </span>
                  <span className="text-xs text-slate-500">系統</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  ピラー & クラスター構造
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0B0F17] flex flex-col justify-between space-y-2">
                <span className="text-[11px] font-mono text-slate-400">Canonical / コンパニオン健全性</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold font-mono ${
                    (sitemap.analytics?.canonicalCompanion?.potentialCanonicalConflictCount ?? 0) === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {sitemap.analytics?.canonicalCompanion?.selfCanonicalCount ?? sitemap.totalUrls}
                  </span>
                  <span className="text-xs text-slate-500">/ {sitemap.totalUrls} 件正規</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  コンパニオンURL: {sitemap.analytics?.canonicalCompanion?.companionUrlsTotal ?? 0}件
                </span>
              </div>
            </div>

            {/* 1. ハブページ & トピッククラスター分析セクション */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-violet-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    ハブページ & トピッククラスター階層分析 (Hub & Pillar Clusters)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {sitemap.analytics?.hubClusters?.length ?? 0} クラスター検出
                </span>
              </div>

              <div className="p-5">
                {sitemap.analytics?.hubClusters && sitemap.analytics.hubClusters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sitemap.analytics.hubClusters.map((cluster, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-white/[0.06] bg-black/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-violet-300">
                            {cluster.hubPath} (ハブ親URL)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            配下 {cluster.childPageCount} ページ
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {cluster.hubUrl}
                        </div>
                        <div className="space-y-1 pt-1 border-t border-white/5">
                          <span className="text-[10px] text-slate-500 font-mono">配下クラスターURL例:</span>
                          {cluster.sampleChildren.map((child, cIdx) => (
                            <div key={cIdx} className="text-[11px] font-mono text-slate-300 truncate flex items-center gap-1.5">
                              <span className="text-slate-600">↳</span>
                              <span className="truncate">{child}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono">
                    階層化されたハブ/クラスター構造は検出されませんでした（単一またはフラット階層のサイト構成です）。
                  </div>
                )}
              </div>
            </div>

            {/* 2. カノニカル & コンパニオンURL分析セクション */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    カノニカル（正規化） & コンパニオンURL整合性 (Canonical & Companion Audit)
                  </h3>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
                  <span className="text-slate-400 text-[11px]">正規（Self-canonical）URL</span>
                  <div className="text-lg font-bold text-emerald-400">
                    {sitemap.analytics?.canonicalCompanion?.selfCanonicalCount ?? sitemap.totalUrls} 件
                  </div>
                  <p className="text-[10px] text-slate-500">パラメータのない安全なURL</p>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
                  <span className="text-slate-400 text-[11px]">非正規/クエリ付きURL警告</span>
                  <div className={`text-lg font-bold ${
                    (sitemap.analytics?.canonicalCompanion?.potentialCanonicalConflictCount ?? 0) > 0 ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {sitemap.analytics?.canonicalCompanion?.potentialCanonicalConflictCount ?? 0} 件
                  </div>
                  <p className="text-[10px] text-slate-500">utm/filter等パラメータの混入</p>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
                  <span className="text-slate-400 text-[11px]">多言語 Hreflang コンパニオン</span>
                  <div className="text-lg font-bold text-sky-400">
                    {sitemap.analytics?.canonicalCompanion?.hreflangCount ?? 0} 件
                  </div>
                  <p className="text-[10px] text-slate-500">xhtml:link 多言語対URL</p>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
                  <span className="text-slate-400 text-[11px]">モバイル/AMP コンパニオン</span>
                  <div className="text-lg font-bold text-violet-400">
                    {sitemap.analytics?.canonicalCompanion?.ampCount ?? 0} 件
                  </div>
                  <p className="text-[10px] text-slate-500">alternate モバイル/AMP対URL</p>
                </div>
              </div>
            </div>

            {/* Issues */}
            {sitemap.issues.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>検出された課題・警告 ({sitemap.issues.length}件)</span>
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  {sitemap.issues.map((issue, idx) => (
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

            {/* URL List */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-white">
                  サイトマップ登録URL一覧 (最大先頭100件 / 全 {sitemap.totalUrls}件)
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Format: {sitemap.isSitemapIndex ? 'Sitemap Index' : 'URLset'}
                </span>
              </div>

              <div className="divide-y divide-white/[0.06] max-h-[440px] overflow-y-auto">
                {sitemap.urls.length > 0 ? (
                  sitemap.urls.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between gap-4 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-slate-500 text-[10px] w-6 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        {entry.isHubPage && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                            HUB
                          </span>
                        )}
                        <span className="text-slate-200 truncate">{entry.loc}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-[11px] text-slate-400">
                        {entry.companionUrls && entry.companionUrls.length > 0 && (
                          <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            コンパニオン {entry.companionUrls.length}件
                          </span>
                        )}
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

            {/* Code Proposal */}
            {sitemap.generatedNextjsCode && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-sky-400" />
                    <h3 className="text-xs font-mono font-bold text-white">
                      Next.js App Router 推奨コード (app/sitemap.ts)
                    </h3>
                  </div>
                  <button
                    onClick={() => handleCopyCode(sitemap.generatedNextjsCode!)}
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? (
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
                  <pre>{sitemap.generatedNextjsCode}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
