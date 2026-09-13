'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Bot,
  ShieldAlert,
  Smartphone,
  Layers,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { GscInspectResult } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function GoogleInspectPage() {
  const [url, setUrl] = useState('https://seo.n-n.tokyo');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(GscInspectResult & { isSimulated?: boolean; siteUrl?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const sid = localStorage.getItem('seo_google_session_id') || '';
    setSessionId(sid);
  }, []);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/google/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), sessionId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'URL検査に失敗しました');
    } finally {
      setLoading(false);
    }
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
                <h1 className="text-base font-bold text-white tracking-tight">Search Console URL検査 (SCR-18)</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  GSC Inspection API
                </span>
              </div>
              <p className="text-xs text-slate-400">Googleインデックス登録状況、カノニカル、モバイル判定の詳細インスペクター</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/google/indexing"
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
            >
              Indexing API 送信へ →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* URL Input Form */}
        <section className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleInspect} className="space-y-4">
            <label className="block text-xs font-mono text-cyan-400 uppercase tracking-wider">検査対象のURLを入力</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{loading ? 'Google検証中...' : 'URLを検査する'}</span>
              </button>
            </div>
            {!sessionId && (
              <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Googleアカウント未連携のため、HTTPステータスとRobots/Metaタグによるローカル高精度検査を実行します。公式GSC APIデータと照合する場合は「Google公式統合ハブ」で連携してください。</span>
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

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Status Overview Card */}
            <div className={`p-6 rounded-2xl border ${
              result.verdict === 'PASS'
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : result.verdict === 'FAIL'
                ? 'bg-rose-500/5 border-rose-500/30'
                : 'bg-amber-500/5 border-amber-500/30'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase text-slate-400">検査判定ステータス:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                      result.verdict === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : result.verdict === 'FAIL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {result.verdict === 'PASS' ? '✅ インデックス登録済み (PASS)' : result.verdict === 'FAIL' ? '❌ 未登録 / エラー (FAIL)' : '⚠️ 保留 / 部分一致 (PARTIAL)'}
                    </span>
                    {result.isSimulated && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                        ローカル検証モード
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white break-all">{result.inspectionUrl}</p>
                  <p className="text-xs text-slate-400 font-mono">状態詳細: {result.coverageState}</p>
                </div>
                {result.lastCrawlTime && (
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-500 block">最終クロール日時</span>
                    <span className="text-xs font-mono text-slate-300">{new Date(result.lastCrawlTime).toLocaleString('ja-JP')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Robots & Indexing */}
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Bot className="w-4 h-4" />
                  <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">クロール & インデックス可否</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">robots.txt</span>
                    <span className="font-mono text-emerald-400 font-bold">{result.robotsTxtState}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">インデックス状態</span>
                    <span className="font-mono text-slate-200">{result.indexingState}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">ページ取得ステータス</span>
                    <span className="font-mono text-emerald-400">{result.pageFetchState}</span>
                  </div>
                </div>
              </div>

              {/* Canonical Info */}
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-violet-400">
                  <Layers className="w-4 h-4" />
                  <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">正規化 (Canonical) 照合</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ユーザー指定カノニカル</span>
                    <span className="font-mono text-slate-300 break-all">{result.userCanonical || '(指定なし)'}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-slate-400 block text-[10px]">Googleが選択した正規URL</span>
                    <span className="font-mono text-cyan-300 break-all">{result.googleCanonical || '(未確定またはユーザー指定と同等)'}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Usability & Rich Results */}
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">モバイル判定 & リッチリザルト</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">モバイル判定</span>
                    <span className="font-mono text-emerald-400 font-bold">{result.mobileUsabilityResult?.verdict || 'PASS'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1">検出された構造化データ</span>
                    <div className="flex flex-wrap gap-1">
                      {result.richResults && result.richResults.length > 0 ? (
                        result.richResults.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-mono text-slate-300 border border-white/5">
                            {r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">検出なし</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
