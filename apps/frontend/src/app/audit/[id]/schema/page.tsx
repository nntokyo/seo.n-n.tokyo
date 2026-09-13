'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { FullAuditResult } from '@seo/shared';

export default function AuditSchemaPage() {
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

  const sampleJsonLd = `{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "${audit.meta.title || 'WebSite'}",\n  "url": "${audit.url}",\n  "description": "${audit.meta.description || ''}"\n}`;

  const copyCode = () => {
    navigator.clipboard.writeText(sampleJsonLd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">構造化データ検証 (Schema.org)</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-09
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            JSON-LD リッチリザルト & エンティティ判定
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Google検索のリッチリザルト選出およびAIナレッジグラフ構築に必要な構造化データの埋め込み状態です。
          </p>
        </div>

        {/* Detected Schemas */}
        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              検出された Schema Types ({audit.meta.schemaTypes.length}件)
            </span>
            <span className={`text-xs font-mono px-3 py-1 rounded-full ${
              audit.meta.schemaTypes.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {audit.meta.schemaTypes.length > 0 ? '検出済み' : '未検出'}
            </span>
          </div>

          {audit.meta.schemaTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {audit.meta.schemaTypes.map((t, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-sans">
              JSON-LD形式の構造化データが検出されませんでした。WebSiteやOrganization等の構造化データを付与することを強く推奨します。
            </p>
          )}
        </div>

        {/* Recommended Code */}
        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              推奨 WebSite 構造化データ (JSON-LD)
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'コピー完了' : 'コードをコピー'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
            {sampleJsonLd}
          </pre>
        </div>
      </main>
    </div>
  );
}
