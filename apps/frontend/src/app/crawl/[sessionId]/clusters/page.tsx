'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Layers,
  Share2,
  AlertTriangle,
  FolderTree,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Search,
  ShieldAlert,
  ArrowRight,
  Download
} from 'lucide-react';
import { InternalLinkOptimizationReport } from '@seo/shared';

export default function CrawlClustersPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<InternalLinkOptimizationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'all' | 'technical' | 'classification' | 'cannibalization' | 'priority' | 'opportunities' | 'orphan' | 'footer'
  >('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/crawl/${sessionId}/clusters`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        setReport(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyMarkdownReport = () => {
    if (!report) return;
    let md = `# 内部リンク＆トピッククラスター最適化レポート\n対象URL: ${report.targetUrl}\n生成日時: ${report.generatedAt}\n\n`;

    md += `### Technical Issues\n| URL | Issue | Severity | Recommended Action |\n| --- | ----- | -------- | ------------------ |\n`;
    for (const item of report.technicalIssues) {
      md += `| ${item.url} | ${item.issue} | ${item.severity} | ${item.recommendedAction} |\n`;
    }

    md += `\n### Page Classification\n| URL | Topic | Intent | Page Type | Cluster | Click Depth | Inlinks |\n| --- | ----- | ------ | --------- | ------- | ----------: | ------: |\n`;
    for (const item of report.pageClassifications) {
      md += `| ${item.url} | ${item.topic} | ${item.intent} | ${item.pageType} | ${item.cluster} | ${item.clickDepth} | ${item.inlinks} |\n`;
    }

    md += `\n### Cannibalization\n| Query | URL A | URL B | Evidence | Recommendation |\n| ----- | ----- | ----- | -------- | -------------- |\n`;
    for (const item of report.cannibalizations) {
      md += `| ${item.query} | ${item.urlA} | ${item.urlB} | ${item.evidence} | ${item.recommendation} |\n`;
    }

    md += `\n### Priority Pages\n| Priority | URL | Query | Impressions | CTR | Position | Inlinks | Reason |\n| -------- | --- | ----- | ----------: | --: | -------: | ------: | ------ |\n`;
    for (const item of report.priorityPages) {
      md += `| ${item.priority} | ${item.url} | ${item.query} | ${item.impressions} | ${item.ctr} | ${item.position} | ${item.inlinks} | ${item.reason} |\n`;
    }

    md += `\n### Internal Link Opportunities\n| Score | Source URL | Destination URL | Existing Sentence | Proposed Sentence | Anchor Text | Reason |\n| ----: | ---------- | --------------- | ----------------- | ----------------- | ----------- | ------ |\n`;
    for (const item of report.internalLinkOpportunities) {
      md += `| ${item.score} | ${item.sourceUrl} | ${item.destinationUrl} | ${item.existingSentence} | ${item.proposedSentence} | ${item.anchorText} | ${item.reason} |\n`;
    }

    md += `\n### Orphan Pages\n| URL | SEO Value | Suggested Source | Action |\n| --- | --------- | ---------------- | ------ |\n`;
    for (const item of report.orphanPages) {
      md += `| ${item.url} | ${item.seoValue} | ${item.suggestedSource} | ${item.action} |\n`;
    }

    md += `\n### Footer / Navigation\n| URL | Placement | Recommendation | Reason |\n| --- | --------- | -------------- | ------ |\n`;
    for (const item of report.footerNavigation) {
      md += `| ${item.url} | ${item.placement} | ${item.recommendation} | ${item.reason} |\n`;
    }

    copyText(md, 'full_markdown');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/crawl/${sessionId}`}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>進捗に戻る</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white tracking-tight">内部リンク＆クラスター最適化診断</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                18-RULE ENGINE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyMarkdownReport}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'full_markdown' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'full_markdown' ? 'コピー完了!' : 'Markdown形式コピー'}</span>
            </button>
            <Link
              href={`/crawl/${sessionId}/graph`}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>有向グラフ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Title & Target */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Webサイト全体の内部リンク構造・トピッククラスター診断結果</span>
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-1">
              対象URL: <span className="text-cyan-400">{report?.targetUrl || '読込中...'}</span>
            </p>
          </div>
        </div>

        {/* Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500">技術的課題</span>
            <div className="text-2xl font-bold font-mono text-red-400">
              {report?.technicalIssues.length || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500">分類ページ数</span>
            <div className="text-2xl font-bold font-mono text-white">
              {report?.pageClassifications.length || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500">カニバリゼーション疑い</span>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {report?.cannibalizations.length || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500">優先改善ページ</span>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {report?.priorityPages.length || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500">文脈リンク改善機会</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {report?.internalLinkOpportunities.length || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500">孤立ページ (Orphan)</span>
            <div className="text-2xl font-bold font-mono text-violet-400">
              {report?.orphanPages.length || 0}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.08] text-xs font-mono">
          {[
            { id: 'all', label: '全テーブル表示' },
            { id: 'technical', label: `Technical Issues (${report?.technicalIssues.length || 0})` },
            { id: 'classification', label: `Page Classification (${report?.pageClassifications.length || 0})` },
            { id: 'cannibalization', label: `Cannibalization (${report?.cannibalizations.length || 0})` },
            { id: 'priority', label: `Priority Pages (${report?.priorityPages.length || 0})` },
            { id: 'opportunities', label: `Link Opportunities (${report?.internalLinkOpportunities.length || 0})` },
            { id: 'orphan', label: `Orphan Pages (${report?.orphanPages.length || 0})` },
            { id: 'footer', label: `Footer / Nav (${report?.footerNavigation.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table 1: Technical Issues */}
        {(activeTab === 'all' || activeTab === 'technical') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <span>1. Technical Issues</span>
              </h2>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5">URL</th>
                      <th className="p-3.5">Issue</th>
                      <th className="p-3.5">Severity</th>
                      <th className="p-3.5">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.technicalIssues.length ? (
                      report.technicalIssues.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-3.5 max-w-xs truncate text-cyan-300">
                            <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                              <span>{item.url}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                            </a>
                          </td>
                          <td className="p-3.5 font-semibold text-white">{item.issue}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.severity === 'Critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              item.severity === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {item.severity}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-sans">{item.recommendedAction}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500 font-sans">
                          技術的課題（リンク切れ、重大なCanonical不整合）は検出されませんでした。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Table 2: Page Classification */}
        {(activeTab === 'all' || activeTab === 'classification') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-cyan-400" />
              <span>2. Page Classification (検索意図 & トピック分類)</span>
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5">URL</th>
                      <th className="p-3.5">Topic</th>
                      <th className="p-3.5">Intent</th>
                      <th className="p-3.5">Page Type</th>
                      <th className="p-3.5">Cluster</th>
                      <th className="p-3.5 text-right">Click Depth</th>
                      <th className="p-3.5 text-right">Inlinks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.pageClassifications.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 max-w-xs truncate text-cyan-300">{item.url}</td>
                        <td className="p-3.5 text-white">{item.topic}</td>
                        <td className="p-3.5 text-slate-400">{item.intent}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-slate-200">
                            {item.pageType}
                          </span>
                        </td>
                        <td className="p-3.5 text-emerald-400 font-bold">{item.cluster}</td>
                        <td className="p-3.5 text-right font-bold text-slate-200">{item.clickDepth}</td>
                        <td className="p-3.5 text-right font-bold text-cyan-300">{item.inlinks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Table 3: Cannibalization */}
        {(activeTab === 'all' || activeTab === 'cannibalization') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>3. Cannibalization (検索意図・Title競合)</span>
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5">Query / Topic</th>
                      <th className="p-3.5">URL A</th>
                      <th className="p-3.5">URL B</th>
                      <th className="p-3.5">Evidence</th>
                      <th className="p-3.5">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.cannibalizations.length ? (
                      report.cannibalizations.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-3.5 font-bold text-amber-400">{item.query}</td>
                          <td className="p-3.5 max-w-xs truncate text-cyan-300">{item.urlA}</td>
                          <td className="p-3.5 max-w-xs truncate text-cyan-300">{item.urlB}</td>
                          <td className="p-3.5 font-sans text-slate-400">{item.evidence}</td>
                          <td className="p-3.5 font-sans text-emerald-300">{item.recommendation}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500 font-sans">
                          同一Titleタグによる明確な競合は検出されませんでした。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Table 4: Priority Pages */}
        {(activeTab === 'all' || activeTab === 'priority') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span>4. Priority Pages (改善優先ページ)</span>
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5">Priority</th>
                      <th className="p-3.5">URL</th>
                      <th className="p-3.5">Target Query</th>
                      <th className="p-3.5 text-right">Impressions</th>
                      <th className="p-3.5 text-right">CTR</th>
                      <th className="p-3.5 text-right">Position</th>
                      <th className="p-3.5 text-right">Inlinks</th>
                      <th className="p-3.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.priorityPages.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {item.priority}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-cyan-300">{item.url}</td>
                        <td className="p-3.5 text-white">{item.query}</td>
                        <td className="p-3.5 text-right text-slate-400">{item.impressions}</td>
                        <td className="p-3.5 text-right text-slate-400">{item.ctr}</td>
                        <td className="p-3.5 text-right text-slate-400">{item.position}</td>
                        <td className="p-3.5 text-right font-bold text-cyan-300">{item.inlinks}</td>
                        <td className="p-3.5 font-sans text-slate-400">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Table 5: Internal Link Opportunities */}
        {(activeTab === 'all' || activeTab === 'opportunities') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-emerald-400" />
              <span>5. Internal Link Opportunities (文脈リンク改善機会)</span>
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5 text-right">Score</th>
                      <th className="p-3.5">Source URL</th>
                      <th className="p-3.5">Destination URL</th>
                      <th className="p-3.5">Proposed Sentence</th>
                      <th className="p-3.5">Anchor Text</th>
                      <th className="p-3.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.internalLinkOpportunities.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {item.score.toFixed(1)} / 5.0
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[180px] truncate text-slate-300">{item.sourceUrl}</td>
                        <td className="p-3.5 max-w-[180px] truncate text-cyan-300">{item.destinationUrl}</td>
                        <td className="p-3.5 font-sans text-slate-300 max-w-md">{item.proposedSentence}</td>
                        <td className="p-3.5 font-sans font-bold text-cyan-400 underline">{item.anchorText}</td>
                        <td className="p-3.5 font-sans text-slate-400">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Table 6: Orphan Pages */}
        {(activeTab === 'all' || activeTab === 'orphan') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-violet-400" />
              <span>6. Orphan Pages (被リンク0の孤立ページ)</span>
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5">URL</th>
                      <th className="p-3.5">SEO Value</th>
                      <th className="p-3.5">Suggested Source</th>
                      <th className="p-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.orphanPages.length ? (
                      report.orphanPages.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-3.5 max-w-xs truncate text-cyan-300">{item.url}</td>
                          <td className="p-3.5 text-white">{item.seoValue}</td>
                          <td className="p-3.5 text-slate-300">{item.suggestedSource}</td>
                          <td className="p-3.5 font-sans text-slate-400">{item.action}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500 font-sans">
                          孤立ページは検出されませんでした。すべてのページに1本以上の内部リンクが存在します。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Table 7 & 8: Footer Navigation */}
        {(activeTab === 'all' || activeTab === 'footer') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-400" />
              <span>7. Footer / Navigation 構造評価</span>
            </h2>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-slate-400">
                    <tr>
                      <th className="p-3.5">URL</th>
                      <th className="p-3.5">Placement</th>
                      <th className="p-3.5">Recommendation</th>
                      <th className="p-3.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {report?.footerNavigation.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 max-w-xs truncate text-cyan-300">{item.url}</td>
                        <td className="p-3.5 text-white">{item.placement}</td>
                        <td className="p-3.5 font-sans text-emerald-300">{item.recommendation}</td>
                        <td className="p-3.5 font-sans text-slate-400">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
