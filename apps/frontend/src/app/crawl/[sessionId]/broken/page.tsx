'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Share2,
  FolderTree,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { CrawlBrokenResponse } from '@seo/shared';

export default function CrawlBrokenPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<CrawlBrokenResponse | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/crawl/${sessionId}/broken`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => setData(res));
  }, [sessionId]);

  const copyUrl = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/crawl/${sessionId}`}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>進捗に戻る</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-white tracking-tight">リンク切れ (404) 一覧</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-red-500/30 text-red-400 bg-red-500/10">
                SCR-13
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/crawl/${sessionId}/graph`}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>有向グラフ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              検出されたリンク切れ & エラーURL ({data?.totalBroken || 0}件)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              サイト巡回中に発見されたHTTP 404/500などの未到達リンクと、そのリンクが記載されている発リンク元URLです。
            </p>
          </div>
        </div>

        {data && data.brokenLinks.length > 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-[#0F1623] overflow-hidden">
            <div className="divide-y divide-white/[0.06] text-xs font-mono">
              <div className="px-5 py-3 bg-black/40 text-slate-400 grid grid-cols-12 text-[10px] uppercase tracking-wider font-bold">
                <div className="col-span-2">ステータス</div>
                <div className="col-span-4">リンク切れURL (Broken URL)</div>
                <div className="col-span-4">発リンク元ページ (Source Page)</div>
                <div className="col-span-2 text-right">アンカーテキスト</div>
              </div>

              {data.brokenLinks.map((item, idx) => (
                <div key={idx} className="px-5 py-4 grid grid-cols-12 items-center gap-3 hover:bg-white/[0.02]">
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      {item.httpStatus ? `HTTP ${item.httpStatus}` : 'ERR_TIMEOUT'}
                    </span>
                  </div>

                  <div className="col-span-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white truncate font-bold" title={item.targetUrl}>
                        {item.targetUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyUrl(item.targetUrl, idx)}
                        className="text-slate-500 hover:text-white p-1 rounded"
                        title="URLをコピー"
                      >
                        {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-red-300/80">{item.errorReason}</p>
                  </div>

                  <div className="col-span-4 space-y-1">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline truncate flex items-center gap-1"
                      title={item.sourceUrl}
                    >
                      <span className="truncate">{item.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="col-span-2 text-right text-slate-300 truncate" title={item.anchorText}>
                    "{item.anchorText}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-3xl border border-white/[0.08] bg-[#0F1623] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">リンク切れは検出されませんでした</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              巡回されたすべての内部リンクがHTTP 200で正常に応答しています。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
