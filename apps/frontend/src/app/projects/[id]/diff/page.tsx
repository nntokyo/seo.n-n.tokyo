'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { AuditTimeTravelDiffResponse, AuditDiffItem } from '@seo/shared';

export default function AuditDiffPage() {
  const params = useParams();
  const id = params.id as string;

  const [diffData, setDiffData] = useState<AuditTimeTravelDiffResponse | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'changed'>('changed');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/projects/${id}/diff`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || '差分データの取得に失敗しました');
        }
        return r.json();
      })
      .then((data) => setDiffData(data))
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const displayedItems = diffData?.diffItems.filter((item) => {
    if (filterType === 'changed') {
      return item.changeType !== 'unchanged';
    }
    return true;
  }) || [];

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${id}`}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>プロジェクト詳細へ</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white tracking-tight">Time-Travel 履歴差分比較</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10">
                SCR-17
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${id}`}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-colors"
            >
              履歴一覧
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {errorMsg ? (
          <div className="p-8 rounded-3xl border border-white/10 bg-[#0F1623] text-center space-y-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">{errorMsg}</h3>
            <p className="text-xs text-slate-400">
              差分を算出するには最低2回以上の診断実行履歴が必要です。トップページから再診断を行ってください。
            </p>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold font-mono text-xs inline-block mt-2"
            >
              トップから再診断する
            </Link>
          </div>
        ) : diffData ? (
          <>
            {/* Top Score Comparison Banner */}
            <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-violet-400">
                    {diffData.project.name} ({diffData.project.targetDomain})
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    前回診断 vs 最新診断 スコア変動
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  {/* Before */}
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block">
                      前回 ({new Date(diffData.baseAudit.auditedAt).toLocaleDateString('ja-JP')})
                    </span>
                    <span className="text-2xl font-bold font-mono text-slate-300">
                      {diffData.baseAudit.score}点
                    </span>
                  </div>

                  <ArrowLeft className="w-4 h-4 text-slate-600 rotate-180" />

                  {/* After */}
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block">
                      最新 ({new Date(diffData.compareAudit.auditedAt).toLocaleDateString('ja-JP')})
                    </span>
                    <span className="text-3xl font-extrabold font-mono text-emerald-400">
                      {diffData.compareAudit.score}点
                    </span>
                  </div>

                  {/* Delta Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1 ${
                      diffData.scoreDelta > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : diffData.scoreDelta < 0
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {diffData.scoreDelta > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : diffData.scoreDelta < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {diffData.scoreDelta > 0 ? `+${diffData.scoreDelta}` : diffData.scoreDelta} 点
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary 3-Box */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-400">改善された項目</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {diffData.summary.improvedCount} 件
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-0.5">
                  <span className="text-[10px] font-mono text-red-400">悪化・低下した項目</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {diffData.summary.degradedCount} 件
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06] space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400">スコア維持・変化なし</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {diffData.summary.unchangedCount} 件
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Toggle & Diff List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterType('changed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors ${
                      filterType === 'changed'
                        ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400'
                    }`}
                  >
                    変動項目のみ ({diffData.summary.improvedCount + diffData.summary.degradedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400'
                    }`}
                  >
                    全項目 ({diffData.diffItems.length})
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
                <div className="divide-y divide-white/[0.06] text-xs font-mono">
                  <div className="px-5 py-3 bg-black/40 text-slate-400 grid grid-cols-12 text-[10px] uppercase font-bold">
                    <div className="col-span-5">診断メトリクス項目</div>
                    <div className="col-span-3">前回判定 ➔ 最新判定</div>
                    <div className="col-span-4 text-right">変動概要</div>
                  </div>

                  {displayedItems.map((item, idx) => (
                    <div key={idx} className="px-5 py-4 grid grid-cols-12 items-center gap-2 hover:bg-white/[0.02]">
                      <div className="col-span-5 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase">{item.category}</span>
                        <div className="font-bold text-white truncate" title={item.name}>
                          {item.name}
                        </div>
                      </div>

                      <div className="col-span-3 flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            item.statusBefore === 'good'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : item.statusBefore === 'warning'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-red-400 bg-red-500/10'
                          }`}
                        >
                          {item.statusBefore}
                        </span>
                        <span className="text-slate-600">➔</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            item.statusAfter === 'good'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : item.statusAfter === 'warning'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-red-400 bg-red-500/10'
                          }`}
                        >
                          {item.statusAfter}
                        </span>
                      </div>

                      <div className="col-span-4 text-right font-sans text-xs">
                        <span
                          className={
                            item.changeType === 'improved'
                              ? 'text-emerald-400 font-bold'
                              : item.changeType === 'degraded'
                              ? 'text-red-400 font-bold'
                              : 'text-slate-500'
                          }
                        >
                          {item.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
