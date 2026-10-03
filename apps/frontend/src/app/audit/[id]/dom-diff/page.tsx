'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import { AuditLoading, AuditMissing, useStoredAudit } from '../../../../components/AuditResultGate';

export default function AuditDomDiffPage() {
  const params = useParams();
  const id = params.id as string;
  const { audit, phase } = useStoredAudit(id);

  if (phase === 'loading') return <AuditLoading />;
  if (phase === 'missing' || !audit) return <AuditMissing />;

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
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">取得した HTML</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-05
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            取得した HTML
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            保存してあるのは取得した HTML だけです。JavaScript 実行後の DOM とは比べていません。描画後の差分は未確認です。
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            下に出る title と h1 の数は、その HTML から読んだ値です。インデックスできるとは書いていません。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2">
            <div className="p-3 bg-black/30 rounded-xl border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-500">取得した HTML の title</span>
              <div className="text-white break-all">{audit.meta.title || '未設定'}</div>
            </div>
            <div className="p-3 bg-black/30 rounded-xl border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-slate-500">h1</span>
              <div className="text-slate-200">{audit.meta.h1Count} 個。個数は順位条件ではない</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
