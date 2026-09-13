'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { FullAuditResult } from '@seo/shared';

export default function AuditProposalsPage() {
  const params = useParams();
  const id = params.id as string;
  const [audit, setAudit] = useState<FullAuditResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyCode = (code: string, proposalId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(proposalId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const proposalsWithCode = audit.metrics.filter((m) => m.codeDiff || m.proposal);

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
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white tracking-tight">具体的修正コード提案</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                SCR-07
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            コピペ可能な Next.js / HTML 修正スニペット ({proposalsWithCode.length}件)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            検出されたSEO課題に対して、App Routerの `export const metadata` やコンポーネント実装のBefore/Afterコードを提供します。
          </p>
        </div>

        <div className="space-y-4">
          {proposalsWithCode.map((m) => (
            <div key={m.id} className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{m.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    m.status === 'good' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              {m.proposal && (
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  💡 {m.proposal}
                </p>
              )}

              {m.codeDiff && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl space-y-1">
                    <span className="text-[10px] text-red-400 font-bold">現状の問題コード (Before)</span>
                    <pre className="text-red-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {m.codeDiff.before}
                    </pre>
                  </div>
                  <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-1 relative">
                    <span className="text-[10px] text-emerald-400 font-bold">推奨修正コード (After)</span>
                    <pre className="text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {m.codeDiff.after}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyCode(m.codeDiff!.after, m.id)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1"
                    >
                      {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
