'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Code2,
  Copy,
  Check
} from 'lucide-react';
import { FullAuditResult } from '@seo/shared';

export default function AuditAiPreviewPage() {
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const aeoMetrics = audit.metrics.filter((m) => m.category === 'aeo_llmo');

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
              <Bot className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white tracking-tight">AI表示 (GEO) シミュレータ</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10">
                SCR-06
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tools/llms-txt"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>llms.txt生成</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Google AI Overviews & SearchGPT 引用確率シミュレーション
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            大規模言語モデル（LLM）が自社サイトを回答カードやソースとして選出する適性をスコアリングします。
          </p>
        </div>

        {/* AI Overview Simulation Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-violet-500/30 bg-violet-950/10 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google AI Overviews 疑似プレビュー</span>
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30">
              引用適性スコア: {audit.scores.aeo_llmo}点 / 100点
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3 font-sans">
            <h3 className="text-sm font-bold text-white leading-snug">
              「{audit.meta.title?.slice(0, 30) || audit.url}」に関するAI概要:
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {audit.meta.description || 'サイト内の主要コンテンツと構造化データがAIによって解析され、結論先行の定義文が優先的に抽出されます。'}
            </p>
            <div className="pt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>H1見出し: <strong className="text-emerald-400">{audit.meta.h1Count === 1 ? '適合' : '要改善'}</strong></span>
              <span>構造化データ: <strong className="text-cyan-400">{audit.meta.schemaTypes.length > 0 ? `${audit.meta.schemaTypes.length}件` : '未検出'}</strong></span>
              <span>ファクト密度: <strong className="text-emerald-400">{audit.scores.aeo_llmo >= 80 ? '高' : '中'}</strong></span>
            </div>
          </div>
        </div>

        {/* AEO Metrics */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">AEO / GEO 最適化項目一覧</h2>
          <div className="space-y-3">
            {aeoMetrics.map((m) => (
              <div key={m.id} className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{m.name}</span>
                  <span className="text-xs font-mono text-violet-400">{m.score}点</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{m.message}</p>
                {m.proposal && (
                  <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs font-sans text-violet-300">
                    💡 推奨: {m.proposal}
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
