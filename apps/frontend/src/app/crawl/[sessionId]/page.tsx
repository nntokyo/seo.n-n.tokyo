'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Globe,
  ArrowLeft,
  Network,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Share2,
  FolderTree,
  ExternalLink,
  ChevronRight,
  Activity,
  ArrowRight
} from 'lucide-react';
import { CrawlSessionSummary, CrawlProgressEvent } from '@seo/shared';

export default function CrawlProgressPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<CrawlSessionSummary | null>(null);
  const [progress, setProgress] = useState<CrawlProgressEvent | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SSEリアルタイム進捗受信
  useEffect(() => {
    if (!sessionId) return;

    // 初回ステータス取得
    fetch(`/api/v1/crawl/${sessionId}/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSession(data);
          if (data.status === 'completed') setIsCompleted(true);
        }
      })
      .catch(() => {});

    const es = new EventSource(`/sse/crawl/${sessionId}`);

    es.onmessage = (event) => {
      try {
        const payload: CrawlProgressEvent = JSON.parse(event.data);
        setProgress(payload);
        if (payload.status === 'completed') {
          setIsCompleted(true);
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      // 接続エラー時は定期ポーリングにフォールバック
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/crawl/${sessionId}/status`);
          if (res.ok) {
            const data = await res.json();
            setSession(data);
            if (data.status === 'completed') {
              setIsCompleted(true);
              clearInterval(poll);
            }
          }
        } catch {}
      }, 2000);
      return () => clearInterval(poll);
    };

    return () => {
      es.close();
    };
  }, [sessionId]);

  const percent = progress ? progress.percent : isCompleted ? 100 : 10;

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/crawl/new"
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>再クロール</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">クロール実行状況</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-11
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              トップ
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        {/* Status Card */}
        <div className="p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-400">セッションID: {sessionId}</span>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <span className="truncate max-w-lg">{session?.targetUrl || 'クロール対象URL'}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                  isCompleted
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 animate-pulse'
                }`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>クロール完了</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>巡回中 ({percent}%)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span className="truncate max-w-md">
                {progress ? `巡回中: ${progress.currentUrl}` : isCompleted ? '全ノードの解析が完了しました' : '準備中...'}
              </span>
              <span>
                {progress ? `${progress.crawledCount} / ${session?.maxPages || 60} ページ` : ''}
              </span>
            </div>
          </div>

          {/* KPI Mini Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-500">巡回済みURL</span>
              <div className="text-2xl font-bold font-mono text-white">
                {progress ? progress.crawledCount : session?.crawledPages || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-500">発見リンク総数</span>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {progress ? progress.totalFound : session?.totalPages || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-500">404 リンク切れ</span>
              <div className="text-2xl font-bold font-mono text-red-400">
                {progress ? progress.brokenCount : session?.brokenLinksCount || 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-500">孤立ページ</span>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {session?.orphanPagesCount || 0}
              </div>
            </div>
          </div>

          {/* Action Hub (完了時に活性化) */}
          {isCompleted && (
            <div className="pt-4 border-t border-white/[0.08] space-y-3">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                解析結果ビューの選択
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href={`/crawl/${sessionId}/graph`}
                  className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Share2 className="w-5 h-5 text-cyan-400" />
                    <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">内部リンク有向グラフ</h3>
                    <p className="text-[11px] text-slate-400 font-sans">
                      全ページの回遊ネットワーク・PageRank集中度を視覚化 (SCR-12)
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/crawl/${sessionId}/broken`}
                  className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">リンク切れ 404 一覧</h3>
                    <p className="text-[11px] text-slate-400 font-sans">
                      発リンク元と被リンク先の切れたURLを特定 (SCR-13)
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/crawl/${sessionId}/tree`}
                  className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FolderTree className="w-5 h-5 text-blue-400" />
                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">サイト構造階層ツリー</h3>
                    <p className="text-[11px] text-slate-400 font-sans">
                      ディレクトリ別の深度と包含関係をツリー表示 (SCR-14)
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
