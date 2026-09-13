'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Plus
} from 'lucide-react';
import { ProjectRecord, ProjectHistoryItem } from '@seo/shared';

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [history, setHistory] = useState<ProjectHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/projects/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res) {
          setProject(res.project);
          setHistory(res.history || []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

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
              <span className="text-sm font-bold text-white tracking-tight">スコア推移 & 履歴</span>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Project Overview Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-slate-500">プロジェクトID: {id}</span>
              <h1 className="text-2xl font-bold text-white mt-1">{project?.name || 'プロジェクト'}</h1>
              <p className="text-xs font-mono text-cyan-400 mt-1">{project?.rootUrl}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 block">最新スコア</span>
                <span className="text-3xl font-extrabold font-mono text-emerald-400">
                  {project?.lastScore || '--'}点
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>診断実行履歴 ({history.length}件)</span>
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
                  <div key={idx} className="px-5 py-4 grid grid-cols-12 items-center gap-2 hover:bg-white/[0.02]">
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
                    <div className="col-span-2 text-right">
                      <Link
                        href={`/audit/${h.auditId}?url=${encodeURIComponent(h.url)}`}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono inline-flex items-center gap-1 transition-colors"
                      >
                        <span>レポート</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] text-center text-xs text-slate-400">
              まだ診断履歴が蓄積されていません。トップページからこのURLの診断を実行すると自動記録されます。
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
