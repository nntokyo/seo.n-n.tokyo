'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Globe
} from 'lucide-react';
import { FullAuditResult } from '@seo/shared';

export default function AuditMetaPage() {
  const params = useParams();
  const id = params.id as string;
  const [audit, setAudit] = useState<FullAuditResult | null>(null);
  const [copied, setCopied] = useState(false);

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

  const metaMetrics = audit.metrics.filter((m) => m.category === 'content' || m.id.includes('meta') || m.id.includes('canonical') || m.id.includes('title') || m.id.includes('og'));

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
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">メタ不具合インスペクター</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-04
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            メタタグ・ソーシャルタグ・カノニカル精密診断
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            タイトルタグ、メタディスクリプション、正規化カノニカルタグ、OGP/Twitter Cardの整合性をインスペクションします。
          </p>
        </div>

        {/* Live Meta Tags Summary */}
        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">検出されたメタタグ一覧</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 bg-black/30 rounded-xl border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-500">Title ({audit.meta.title?.length || 0}文字)</span>
              <div className="text-white font-sans break-all">{audit.meta.title || '未設定'}</div>
            </div>
            <div className="p-3.5 bg-black/30 rounded-xl border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-500">Description ({audit.meta.description?.length || 0}文字)</span>
              <div className="text-white font-sans break-all">{audit.meta.description || '未設定'}</div>
            </div>
            <div className="p-3.5 bg-black/30 rounded-xl border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-500">Canonical</span>
              <div className="text-cyan-400 break-all">{audit.meta.canonical || '未指定 (Self)'}</div>
            </div>
            <div className="p-3.5 bg-black/30 rounded-xl border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-500">Robots / Googlebot</span>
              <div className="text-white">{audit.meta.robots || '未指定'} / {audit.meta.googlebot || '未指定'}</div>
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">メタ関連診断項目 ({metaMetrics.length}件)</h2>
          <div className="space-y-3">
            {metaMetrics.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{m.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold uppercase ${
                      m.status === 'good'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : m.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {m.status} ({m.score}点)
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{m.message}</p>
                {m.proposal && (
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs font-sans text-cyan-300">
                    💡 {m.proposal}
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
