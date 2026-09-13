'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { FullAuditResult } from '@seo/shared';

export default function AuditCwvPage() {
  const params = useParams();
  const id = params.id as string;
  const [audit, setAudit] = useState<FullAuditResult | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/audit/results/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAudit(data));
  }, [id]);

  if (!audit) {
    return (
      <div className="min-h-screen bg-[#080B11] flex items-center justify-center text-slate-400 font-mono text-xs">
        読み込み中...
      </div>
    );
  }

  const cwvMetrics = audit.metrics.filter((m) => m.category === 'cwv');
  const cwv = audit.cwv;

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/audit/${id}`}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>総合診断に戻る</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white tracking-tight">Core Web Vitals パフォーマンス詳細</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                SCR-08
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/google/hub?url=${encodeURIComponent(audit.url)}`}
              className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Google公式CrUX実測値</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            ユーザー体験メトリクス (LCP / FCP / CLS / TTFB)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            DOMサイズ、ブロッキングリソース、サーバー応答時間から推計したCore Web Vitals指標です。
          </p>
        </div>

        {/* 4連 KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-400">LCP (最大描画)</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">{cwv?.lcp || 0} ms</div>
            <span className="text-[9px] font-mono text-slate-500">目標: 2500ms以内</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-400">FCP (初回描画)</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">{cwv?.fcp || 0} ms</div>
            <span className="text-[9px] font-mono text-slate-500">目標: 1800ms以内</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-400">CLS (視覚的安定)</span>
            <div className="text-2xl font-bold font-mono text-cyan-400">{cwv?.cls || 0}</div>
            <span className="text-[9px] font-mono text-slate-500">目標: 0.1以下</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-400">TTFB (応答初動)</span>
            <div className="text-2xl font-bold font-mono text-white">{cwv?.ttfb || audit.responseTimeMs} ms</div>
            <span className="text-[9px] font-mono text-slate-500">目標: 800ms以内</span>
          </div>
        </div>

        {/* Metric Issues */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">速度・パフォーマンス判定項目</h2>
          <div className="space-y-3">
            {cwvMetrics.map((m) => (
              <div key={m.id} className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{m.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      m.status === 'good' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {m.status} ({m.score}点)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{m.message}</p>
                {m.proposal && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs font-sans text-emerald-300">
                    💡 改善推奨: {m.proposal}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
