'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe,
  ArrowLeft,
  Network,
  Play,
  Cpu,
  Info,
  AlertCircle
} from 'lucide-react';

export default function CrawlNewPage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://seo.n-n.tokyo');
  const [maxPages, setMaxPages] = useState(60);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsStarting(true);
    setErrorMsg(null);

    let norm = url.trim();
    if (!norm.startsWith('http://') && !norm.startsWith('https://')) {
      norm = `https://${norm}`;
    }

    try {
      const res = await fetch('/api/v1/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: norm, maxPages: Number(maxPages) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'クロールジョブの開始に失敗しました');
      }

      const data = await res.json();
      if (data.sessionId) {
        router.push(`/crawl/${data.sessionId}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'クロール開始エラー');
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>トップに戻る</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">ディープクロール管理</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-10
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <span>プロジェクト一覧</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs">
            <Cpu className="w-3.5 h-3.5" />
            <span>Asynchronous Site Crawler & Graph Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ドメイン全体の内部リンク・回遊構造を巡回診断
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            サイト内の全リンクを深さ優先/幅優先で自動巡回。内部リンクの有向グラフ、PageRank重み付け、孤立ページ（Orphan）、404リンク切れ、階層ツリーを全自動生成します。
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleStartCrawl} className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>クロール起点URL (Root URL)</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">
              同一ドメイン内のリンクのみを安全に追跡します。外部リンクは孤立・リンク切れ判定の対象として参照されます。
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-white flex items-center justify-between">
              <span>最大巡回ページ数上限 (Max Pages)</span>
              <span className="text-cyan-400">{maxPages} ページ</span>
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>10ページ (超高速)</span>
              <span>60ページ (標準)</span>
              <span>200ページ (精密)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-1.5">
            <div className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Polite クローラー安全設計</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1リクエストごとに120ms〜150msのウェイトを設け、対象サーバーへの負荷を最小限に抑制します。クロール中も進捗がリアルタイムで画面にストリーミング表示されます。
            </p>
          </div>

          <button
            type="submit"
            disabled={isStarting || !url}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{isStarting ? 'クロールジョブを起動中...' : 'ディープクロールを開始する'}</span>
          </button>
        </form>
      </main>
    </div>
  );
}
