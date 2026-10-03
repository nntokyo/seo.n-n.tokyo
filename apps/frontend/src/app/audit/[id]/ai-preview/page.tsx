'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bot } from 'lucide-react';
import { AuditLoading, AuditMissing, useStoredAudit } from '../../../../components/AuditResultGate';
import { metricPointLabel } from '../../../../components/metric-point';

export default function AuditAiPreviewPage() {
  const params = useParams();
  const id = params.id as string;
  const { audit, phase } = useStoredAudit(id);

  if (phase === 'loading') return <AuditLoading />;
  if (phase === 'missing' || !audit) return <AuditMissing />;

  const aeoMetrics = audit.metrics.filter((m) => m.category === 'aeo_llmo');
  const aiScore = audit.actionPlan?.areas.find((area) => area.id === 'ai')?.score;

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
              <span className="text-sm font-bold text-white tracking-tight">AIクローラーと取得メモ</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10">
                SCR-06
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tools/llms-txt"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-mono transition-colors"
            >
              llms.txt（任意）
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            取得した内容と AI クローラー
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            引用確率は出しません。Google 検索は llms.txt も、生成 AI 用の特別なマークアップも使いません。
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl border border-violet-500/30 bg-violet-950/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono text-violet-300">AIクローラー領域</span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 text-slate-200 border border-white/10">
              {aiScore == null ? '未評価' : `${aiScore} / 100`}
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{audit.aiOverview.summary}</p>
          <dl className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-slate-500">title</dt>
              <dd>{audit.meta.title || 'なし'}</dd>
            </div>
            <div>
              <dt className="font-mono text-slate-500">h1</dt>
              <dd>{audit.meta.h1Count} 件。個数は順位条件ではない</dd>
            </div>
            <div>
              <dt className="font-mono text-slate-500">JSON-LD</dt>
              <dd>{audit.meta.schemaTypes.length > 0 ? audit.meta.schemaTypes.join(', ') : 'なし。必須ではない'}</dd>
            </div>
          </dl>
        </div>

        {/* AEO Metrics */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">関連する検査</h2>
          <div className="space-y-3">
            {aeoMetrics.map((m) => (
              <div key={m.id} className="p-5 rounded-2xl border border-white/[0.08] bg-[#0F1623] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{m.name}</span>
                  <span className="text-xs font-mono text-violet-400">{metricPointLabel(m.status, m.score)}</span>
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
