'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import type { FullAuditResult } from '@seo/shared';

export function useStoredAudit(id: string | undefined) {
  const [audit, setAudit] = useState<FullAuditResult | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!id) {
      setPhase('missing');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    fetch(`/api/v1/audit/results/${id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FullAuditResult | null) => {
        if (cancelled) return;
        if (!data || typeof data !== 'object' || !data.url) {
          setAudit(null);
          setPhase('missing');
          return;
        }
        setAudit(data);
        setPhase('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setAudit(null);
          setPhase('missing');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { audit, phase };
}

export function AuditLoading({ label = '診断レポートを読み込み中...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      <p className="text-sm font-mono text-slate-400">{label}</p>
    </div>
  );
}

export function AuditMissing() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/audit/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        throw new Error('URLの診断に失敗しました。URLを確認してください。');
      }
      const data = await response.json();
      if (!data?.id) {
        throw new Error('診断結果を開けませんでした。');
      }
      router.push(`/audit/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診断エラー');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-white flex flex-col items-center justify-center p-6 space-y-6">
      <div className="p-6 rounded-2xl bg-[#0B0F17] border border-white/10 max-w-lg w-full text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white mb-1">診断レポートが見つかりません</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || '保存された結果が無い、または期限が切れています。URLを入力して診断できます。'}
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            aria-label="診断するURL"
            className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={busy || !url}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors disabled:opacity-50"
          >
            {busy ? '診断中...' : '再診断'}
          </button>
        </form>
        <div className="pt-2 border-t border-white/[0.06]">
          <Link
            href="/"
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>トップページへ戻る</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
