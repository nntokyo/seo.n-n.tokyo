'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FolderTree,
  Folder,
  FileCode,
  Share2,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { CrawlTreeResponse, CrawlTreeItem } from '@seo/shared';

function TreeNodeView({ item }: { item: CrawlTreeItem }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors text-xs font-mono group">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-500 hover:text-white p-0.5"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        {hasChildren ? (
          <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        ) : (
          <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}

        <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
          {item.path}
        </span>

        <span className="text-[10px] text-slate-500">
          (Level {item.depth})
        </span>

        {hasChildren && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {item.childCount} 子ページ
          </span>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white p-1 transition-opacity"
          title="ページを開く"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {hasChildren && isOpen && (
        <div className="pl-6 border-l border-white/[0.08] ml-3.5 space-y-1">
          {item.children!.map((child, idx) => (
            <TreeNodeView key={idx} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CrawlTreePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<CrawlTreeResponse | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/crawl/${sessionId}/tree`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => setData(res));
  }, [sessionId]);

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
              <FolderTree className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-white tracking-tight">サイト構造階層ツリー</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400 bg-blue-500/10">
                SCR-14
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
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            ディレクトリ構造 & 階層深度ツリー ({data?.totalNodes || 0}ノード)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            URLパスのセグメントからサイトの階層包含関係を可視化しています。深い階層（Level 4以降）はクローラーの到達優先度が下がりやすいため注意が必要です。
          </p>
        </div>

        <div className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06] text-xs font-mono text-slate-400">
            <Folder className="w-4 h-4 text-sky-400" />
            <span className="text-white font-bold">{data?.session.targetUrl}</span>
          </div>

          <div className="space-y-2">
            {data?.tree.map((node, idx) => (
              <TreeNodeView key={idx} item={node} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
