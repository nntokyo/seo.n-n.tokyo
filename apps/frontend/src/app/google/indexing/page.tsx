'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Trash2,
  Sparkles,
  Layers,
  History,
} from 'lucide-react';
import { IndexingPublishResult } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function GoogleIndexingPage() {
  const [url, setUrl] = useState('https://seo.n-n.tokyo');
  const [actionType, setActionType] = useState<'URL_UPDATED' | 'URL_DELETED'>('URL_UPDATED');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<IndexingPublishResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const sid = localStorage.getItem('seo_google_session_id') || '';
    setSessionId(sid);
    const saved = localStorage.getItem('seo_indexing_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/google/index-publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          type: actionType,
          sessionId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data: IndexingPublishResult = await res.json();
      const nextHistory = [data, ...history].slice(0, 30);
      setHistory(nextHistory);
      localStorage.setItem('seo_indexing_history', JSON.stringify(nextHistory));
    } catch (err: any) {
      setError(err.message || 'Indexing API通知に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('seo_indexing_history');
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#080B11]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/google/hub"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Google Indexing API 即時送信 (SCR-19)</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Indexing API v3
                </span>
              </div>
              <p className="text-xs text-slate-400">新規公開・更新ページや削除ページのURLをGoogleクローラーへ即時巡回通知</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/google/inspect"
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            >
              ← URL検査へ戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Indexing Trigger Console */}
        <section className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">即時クロールリクエスト送信コンソール</h2>
            <p className="text-xs text-slate-400">
              更新または削除されたURLを入力し、Google Indexing APIへ直接通知します。通常数分から数時間以内にGooglebotの巡回がトリガーされます。
            </p>
          </div>

          <form onSubmit={handlePublish} className="space-y-4">
            {/* Action Type Tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionType('URL_UPDATED')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                  actionType === 'URL_UPDATED'
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                URL_UPDATED (新規公開 / 内容更新)
              </button>
              <button
                type="button"
                onClick={() => setActionType('URL_DELETED')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                  actionType === 'URL_DELETED'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                URL_DELETED (ページ削除 / 410 Gone)
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/updated-article"
                className="flex-1 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{loading ? '送信中...' : 'Indexing通知を送信'}</span>
              </button>
            </div>

            {!sessionId && (
              <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Googleアカウント未連携のため、テスト送信（シミュレーションモード）として処理されます。公式アカウントへの本番送信を行う場合は「Google公式統合ハブ」でログイン連携してください。</span>
              </p>
            )}
          </form>
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* History Stream */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">送信履歴 & レスポンスログ ({history.length}件)</h3>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>履歴をクリア</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
              <p className="text-xs text-slate-500 font-mono">送信履歴はまだありません。上のフォームからURL通知をリクエストしてください。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.type === 'URL_UPDATED' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        item.status === 'SUBMITTED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'SIMULATED_SUCCESS'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(item.notifyTime).toLocaleTimeString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white font-mono break-all">{item.url}</p>
                    <p className="text-[11px] text-slate-400">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
