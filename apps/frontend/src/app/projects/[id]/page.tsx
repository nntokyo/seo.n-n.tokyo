'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Globe,
  ArrowLeft,
  Calendar,
  Activity,
  History,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  GitCompare,
  Plus,
  RefreshCw,
  Network,
  ShieldCheck,
  Layers,
  FileText,
  Search,
  Zap,
  Sparkles,
  Bot,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { ProjectRecord, ProjectHistoryItem } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const fetchProjectData = () => {
    if (!id) return;
    const token = localStorage.getItem('seo_auth_token') || '';
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/api/v1/projects/${id}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res) {
          setProject(res.project);
          setHistory(res.history || []);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // 今すぐこのドメインを診断する
  const handleRunAudit = async () => {
    if (!project) return;
    setIsAuditing(true);
    setAuditError(null);

    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/audit/quick`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: project.rootUrl }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || '診断の実行に失敗しました');
      }

      const result = await res.json();
      router.push(`/audit/${result.id}?url=${encodeURIComponent(project.rootUrl)}`);
    } catch (err: any) {
      setAuditError(err.message || '診断の実行中にエラーが発生しました');
      setIsAuditing(false);
    }
  };

  const latestHistory = history[0];

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>プロジェクト一覧</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">プロジェクト統合ダッシュボード</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-16
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {history.length >= 2 && (
              <Link
                href={`/projects/${id}/diff`}
                className="px-3.5 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Time-Travel 差分比較</span>
              </Link>
            )}

            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isAuditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isAuditing ? '診断実行中...' : '今すぐ診断を実行'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {auditError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}

        {/* Project Overview Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">プロジェクトID: {id}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  ドメイン監視中
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{project?.name || 'プロジェクト'}</h1>
              <a
                href={project?.rootUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 mt-1"
              >
                <span>{project?.rootUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">最新総合スコア</span>
                <div className="flex items-baseline justify-end gap-1">
                  <span className={`text-4xl font-extrabold font-mono ${
                    (project?.lastScore || 0) >= 80 ? 'text-emerald-400' : (project?.lastScore || 0) >= 60 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {project?.lastScore ? `${project.lastScore}` : '--'}
                  </span>
                  <span className="text-xs font-mono text-slate-500">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Score breakdown if available */}
          {latestHistory && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">テクニカルSEO</span>
                <p className="text-lg font-bold font-mono text-emerald-400">{latestHistory.categories.technical}点</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">コンテンツ & メタ</span>
                <p className="text-lg font-bold font-mono text-cyan-400">{latestHistory.categories.content}点</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Core Web Vitals</span>
                <p className="text-lg font-bold font-mono text-amber-400">{latestHistory.categories.cwv}点</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">AI / GEO (AIO)</span>
                <p className="text-lg font-bold font-mono text-violet-400">{latestHistory.categories.aeo_llmo}点</p>
              </div>
            </div>
          )}
        </div>

        {/* ⚡ Execution Hub - All features for this project */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                解析機能コンソール & 各機能の実行ハブ
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Deep Crawl & Link Graph */}
            <div className="p-5 rounded-2xl bg-[#0F1623] border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Network className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">SCR-10〜14</span>
                </div>
                <h3 className="text-sm font-bold text-white">ディープクロール & 内部リンク解析</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  サイト全体を再帰巡回し、有向リンクグラフ、PageRankスコア、404リンク切れを自動検出します。
                </p>
              </div>
              <Link
                href={`/crawl/new?url=${encodeURIComponent(project?.rootUrl || '')}`}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono flex items-center justify-between transition-colors"
              >
                <span>クロールを実行する</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 2. Google Search Console & GA4 Hub */}
            <div className="p-5 rounded-2xl bg-[#0F1623] border border-white/[0.08] hover:border-violet-500/30 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">SCR-27</span>
                </div>
                <h3 className="text-sm font-bold text-white">Google 公式統合ハブ</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  GSC検索流入クエリ、GA4実測PV、PageSpeed、Gemini改善コードをワンストップで統合表示します。
                </p>
              </div>
              <Link
                href={`/google/hub?url=${encodeURIComponent(project?.rootUrl || '')}`}
                className="w-full py-2 px-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 text-xs font-mono flex items-center justify-between transition-colors"
              >
                <span>Google統合ハブを開く</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3. GSC Inspection & Indexing API */}
            <div className="p-5 rounded-2xl bg-[#0F1623] border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">SCR-18/19</span>
                </div>
                <h3 className="text-sm font-bold text-white">インデックス検査 & 即時送信</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Googleでのインデックス登録状況の精密検査と、Indexing APIによるクローラー即時巡回リクエスト。
                </p>
              </div>
              <Link
                href={`/google/inspect?url=${encodeURIComponent(project?.rootUrl || '')}`}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono flex items-center justify-between transition-colors"
              >
                <span>URL検査コンソール</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 4. Sitemap & llms.txt */}
            <div className="p-5 rounded-2xl bg-[#0F1623] border border-white/[0.08] hover:border-sky-500/30 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">SCR-20/26</span>
                </div>
                <h3 className="text-sm font-bold text-white">サイトマップ & llms.txt</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  XMLサイトマップの構文検証・カノニカル不一致解析、AI検索エンジン用の llms.txt を自動生成。
                </p>
              </div>
              <Link
                href={`/tools/sitemap-analyzer?url=${encodeURIComponent(project?.rootUrl || '')}`}
                className="w-full py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-mono flex items-center justify-between transition-colors"
              >
                <span>サイトマップ検証</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* History Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>診断実行履歴タイムライン ({history.length}件)</span>
            </h2>
            {history.length >= 2 && (
              <Link
                href={`/projects/${id}/diff`}
                className="text-xs font-mono text-violet-400 hover:underline flex items-center gap-1"
              >
                <span>前回との差分を比較 (SCR-17)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {history.length > 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
              <div className="divide-y divide-white/[0.06] text-xs font-mono">
                <div className="px-5 py-3 bg-black/40 text-slate-400 grid grid-cols-12 text-[10px] uppercase font-bold">
                  <div className="col-span-3">診断日時</div>
                  <div className="col-span-3">総合スコア</div>
                  <div className="col-span-4">カテゴリ別スコア</div>
                  <div className="col-span-2 text-right">アクション</div>
                </div>

                {history.map((h, idx) => (
                  <div key={idx} className="px-5 py-4 grid grid-cols-12 items-center gap-2 hover:bg-white/[0.02] transition-colors">
                    <div className="col-span-3 text-white truncate">
                      {new Date(h.auditedAt).toLocaleString('ja-JP')}
                    </div>
                    <div className="col-span-3 flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-emerald-400">{h.overallScore}</span>
                      <span className="text-slate-500 text-[10px]">/100</span>
                    </div>
                    <div className="col-span-4 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>SEO: {h.categories.technical}</span>
                      <span>Meta: {h.categories.content}</span>
                      <span>CWV: {h.categories.cwv}</span>
                      <span>AIO: {h.categories.aeo_llmo}</span>
                    </div>
                    <div className="col-span-2 text-right flex justify-end gap-2">
                      <Link
                        href={`/audit/${h.auditId}?url=${encodeURIComponent(h.url)}`}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono inline-flex items-center gap-1 transition-colors"
                      >
                        <span>詳細レポート</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-3xl border border-white/[0.08] bg-[#0F1623] text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <History className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-slate-400">まだ診断履歴が蓄積されていません。</p>
              <button
                onClick={handleRunAudit}
                disabled={isAuditing}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>このプロジェクトの初回診断を実行する</span>
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
