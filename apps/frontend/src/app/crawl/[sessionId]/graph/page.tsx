'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Network,
  Share2,
  RefreshCw,
  Info,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FolderTree
} from 'lucide-react';
import { CrawlGraphResponse, CrawlGraphNode } from '@seo/shared';

export default function CrawlGraphPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [data, setData] = useState<CrawlGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<CrawlGraphNode | null>(null);
  const [filterOrphanOnly, setFilterOrphanOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/v1/crawl/${sessionId}/graph`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res) {
          setData(res);
          if (res.nodes && res.nodes.length > 0) {
            setSelectedNode(res.nodes[0]);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    if (filterOrphanOnly) {
      return data.nodes.filter((n) => n.isOrphan);
    }
    return data.nodes;
  }, [data, filterOrphanOnly]);

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
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">内部リンク有向グラフ</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-12
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/crawl/${sessionId}/broken`}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <span>404一覧</span>
            </Link>
            <Link
              href={`/crawl/${sessionId}/tree`}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-blue-400 flex items-center gap-1.5 transition-colors"
            >
              <span>階層ツリー</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">総ノード数 (Pages)</span>
            <div className="text-2xl font-bold font-mono text-white">{data?.stats.totalNodes || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">内部リンク総接続 (Edges)</span>
            <div className="text-2xl font-bold font-mono text-cyan-400">{data?.stats.totalEdges || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">孤立ページ (Orphan)</span>
            <div className="text-2xl font-bold font-mono text-amber-400">{data?.stats.orphanCount || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">404 リンク切れ</span>
            <div className="text-2xl font-bold font-mono text-red-400">{data?.stats.brokenCount || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0F1623] border border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">最大深度 (Max Depth)</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">Level {data?.stats.maxDepth || 0}</div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOrphanOnly(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors ${
                !filterOrphanOnly ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              全ノード表示 ({data?.nodes.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterOrphanOnly(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors ${
                filterOrphanOnly ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-slate-400'
              }`}
            >
              ⚠️ 孤立ページのみ ({data?.stats.orphanCount || 0})
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            ノードを選択すると右パネルに詳細と被リンク関係が表示されます
          </span>
        </div>

        {/* Split View: Visual Canvas / Node List + Detail Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Node Grid Card List */}
          <div className="lg:col-span-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span>巡回ページノード一覧 (PageRank順)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">{filteredNodes.length} 件</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-left ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-500/10'
                        : 'border-white/[0.06] bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                          node.httpStatus === 200
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {node.httpStatus || 'ERR'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Rank: <strong className="text-cyan-400">{node.pageRankScore}</strong>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate" title={node.title}>
                      {node.title || 'タイトルなし'}
                    </h4>

                    <p className="text-[11px] font-mono text-slate-400 truncate" title={node.url}>
                      {new URL(node.url).pathname}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04]">
                      <span>深度: Level {node.depth}</span>
                      <span>
                        被リンク: <strong className="text-slate-300">{node.inLinksCount}</strong> / 発リンク:{' '}
                        <strong className="text-slate-300">{node.outLinksCount}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspector Panel */}
          <div className="lg:col-span-4 rounded-3xl border border-white/[0.08] bg-[#0F1623] p-6 space-y-5 sticky top-24">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>ノード詳細インスペクター</span>
            </h3>

            {selectedNode ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500">ページタイトル</span>
                  <div className="text-sm font-bold text-white leading-snug">{selectedNode.title}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500">URL</span>
                  <a
                    href={selectedNode.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-cyan-400 hover:underline break-all flex items-center gap-1"
                  >
                    <span>{selectedNode.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                {selectedNode.metaDescription && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500">メタディスクリプション</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedNode.metaDescription}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-0.5">
                    <span className="text-[10px] text-slate-500">被リンク数</span>
                    <div className="text-lg font-bold text-white">{selectedNode.inLinksCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-0.5">
                    <span className="text-[10px] text-slate-500">発リンク数</span>
                    <div className="text-lg font-bold text-white">{selectedNode.outLinksCount}</div>
                  </div>
                </div>

                {/* 孤立判定アラート */}
                {selectedNode.isOrphan && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>孤立ページ (Orphan Page) 警告</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      他のどの巡回ページからも内部リンクされていません。検索エンジンのクローラーが発見しにくく、PageRankが流れていません。
                    </p>
                  </div>
                )}

                {/* このページへの被リンク元一覧 */}
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] font-mono font-bold text-white">このページへの被リンク (Inbound)</span>
                  <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.04] text-[11px] font-mono">
                    {data?.edges
                      .filter((e) => e.target === selectedNode.url)
                      .slice(0, 10)
                      .map((edge, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between gap-2">
                          <span className="text-slate-400 truncate max-w-[180px]" title={edge.source}>
                            {new URL(edge.source).pathname}
                          </span>
                          <span className="text-[10px] text-cyan-400 shrink-0">"{edge.anchorText}"</span>
                        </div>
                      ))}
                    {(!data || data.edges.filter((e) => e.target === selectedNode.url).length === 0) && (
                      <div className="text-xs text-slate-500 py-2">被リンクが存在しません</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-8 text-center">ノードが選択されていません</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
