'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Printer,
  ArrowLeft,
  Globe,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  ShieldCheck,
  Zap,
  Bot
} from 'lucide-react';
import { FullAuditResult } from '@seo/shared';

export default function AuditReportPrintPage() {
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
        レポートを生成中...
      </div>
    );
  }

  const criticalIssues = audit.metrics.filter((m) => m.status === 'critical');
  const warningIssues = audit.metrics.filter((m) => m.status === 'warning');

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-200 print:bg-white print:text-black">
      {/* Non-printable Screen Controls */}
      <div className="print:hidden sticky top-0 z-50 bg-[#080B11] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <Link
          href={`/audit/${id}`}
          className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>監査画面に戻る</span>
        </Link>

        <a
          href={`/api/v1/audit/results/${encodeURIComponent(id)}/pdf`}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>PDFとして保存 / 印刷する</span>
        </a>
      </div>

      {/* Printable Report Sheet */}
      <div className="max-w-4xl mx-auto p-8 sm:p-12 space-y-8 font-sans">
        {/* Header Branding */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                SEO Analyzer v2.0
              </span>
              <span className="text-xs text-slate-500 font-mono">SCR-21 White-label Report</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Webサイト精密SEO・AI表示診断報告書</h1>
            <p className="text-xs text-slate-600 font-mono mt-1">対象URL: {audit.url}</p>
          </div>

          <div className="text-right font-mono">
            <span className="text-xs text-slate-500 block">診断実施日時</span>
            <span className="text-xs font-bold text-slate-800">
              {new Date(audit.timestamp).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>

        {/* Score Summary Box */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-500 block">総合評価スコア</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-5xl font-extrabold font-mono text-slate-900">{audit.overallScore}</span>
              <span className="text-base font-mono text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500">SEO内部構造</span>
              <div className="text-base font-bold text-slate-900">{audit.scores.seo}点</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500">メタ/ソーシャル</span>
              <div className="text-base font-bold text-slate-900">{audit.scores.meta}点</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500">Core Web Vitals</span>
              <div className="text-base font-bold text-slate-900">{audit.scores.performance}点</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500">AEO/AI引用適性</span>
              <div className="text-base font-bold text-slate-900">{audit.scores.aeo_llmo}点</div>
            </div>
          </div>
        </div>

        {/* Priority Action Issues */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>最優先改善課題 ({criticalIssues.length + warningIssues.length}件)</span>
          </h2>

          <div className="divide-y divide-slate-100 text-xs font-mono">
            {[...criticalIssues, ...warningIssues].map((issue, idx) => (
              <div key={idx} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 font-sans">{issue.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      issue.status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {issue.status}
                  </span>
                </div>
                <p className="text-slate-600 font-sans leading-relaxed">{issue.message}</p>
                {issue.proposal && (
                  <p className="text-emerald-800 font-sans bg-emerald-50 p-2 rounded border border-emerald-100 mt-1">
                    💡 改善推奨: {issue.proposal}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Meta & Tech Overview */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900">検出メタデータ & 構造</h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500">タイトルタグ</span>
              <div className="font-sans font-semibold text-slate-800 break-all">{audit.meta.title || '未設定'}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500">正規URL (Canonical)</span>
              <div className="font-sans text-slate-800 break-all">{audit.meta.canonical || '未指定 (Self)'}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500">Googlebot / Robots</span>
              <div className="text-slate-800">{audit.meta.robots || 'index, follow'}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500">H1見出し数</span>
              <div className="text-slate-800">{audit.meta.h1Count} 個</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 text-center text-xs text-slate-500 font-mono">
          © 2026 seo.n-n.tokyo - 個人運営のSEO Analyzerで生成
        </div>
      </div>
    </div>
  );
}
