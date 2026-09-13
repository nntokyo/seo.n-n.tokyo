'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Layers,
  Sparkles,
  BarChart3,
  Search,
  Zap,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function IntegrationsSettingsPage() {
  const [sessionId, setSessionId] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem('seo_google_session_id') || '';
    setSessionId(sid);
    if (sid) {
      fetch(`${API_BASE}/api/v1/integrations/google/session?sessionId=${sid}`)
        .then((res) => res.json())
        .then((data) => {
          setSessionData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleConnect = async () => {
    setAuthLoading(true);
    try {
      const redirectUri = window.location.origin + '/google/hub';
      const res = await fetch(`${API_BASE}/api/v1/integrations/google/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/api/v1/integrations/google/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      localStorage.removeItem('seo_google_session_id');
      setSessionId('');
      setSessionData(null);
      setMessage('Google連携を解除しました');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      <header className="border-b border-white/5 bg-[#080B11]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/google/hub"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">APIアカウント連携管理 (SCR-23)</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Google API Integrations
                </span>
              </div>
              <p className="text-xs text-slate-400">Search Console, GA4, PageSpeed Insights, Gemini APIの接続状態</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {message && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {/* Integration Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Search Console */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Search Console</h3>
                  <span className="text-[11px] font-mono text-slate-400">検索クエリ・インデックス検査</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                sessionData?.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {sessionData?.connected ? '接続中' : '未接続'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              検索パフォーマンスデータの取得や特定URLのインデックス登録可否、Indexing API送信に利用されます。
            </p>
          </div>

          {/* Google Analytics 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Analytics 4 (GA4)</h3>
                  <span className="text-[11px] font-mono text-slate-400">実アクセス・CVR集計</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                sessionData?.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {sessionData?.connected ? '接続中' : '未接続'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              直近28日間のアクティブユーザー数、PV、セッション継続時間、コンバージョン率をSEO診断と並行表示します。
            </p>
          </div>

          {/* PageSpeed Insights & CrUX */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">PageSpeed & CrUX</h3>
                  <span className="text-[11px] font-mono text-slate-400">公式Lighthouse・実測値</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                常時利用可
              </span>
            </div>
            <p className="text-xs text-slate-400">
              サーバー内蔵APIキーにより、アカウント認証なしで高速に公式LighthouseスコアとChrome User Experience Report実測値を取得します。
            </p>
          </div>

          {/* Google Gemini 2.0 */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Gemini 2.0</h3>
                  <span className="text-[11px] font-mono text-slate-400">AI改善提案・コード生成</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                内蔵有効化
              </span>
            </div>
            <p className="text-xs text-slate-400">
              診断スコアと検索クエリ、GA4指標を統合分析し、クリック率を最大化するタイトル・説明文・修正コードを自動生成します。
            </p>
          </div>
        </div>

        {/* Global Action Box */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Google アカウント認証アクション</h4>
            <p className="text-xs text-slate-400">
              {sessionData?.connected
                ? `現在「${sessionData.email || 'Googleアカウント'}」と連携しています。`
                : 'Googleアカウントと連携すると、GSCおよびGA4の実データを自動集約できます。'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sessionData?.connected ? (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-mono transition-colors cursor-pointer"
              >
                連携を解除する
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={authLoading}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {authLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Googleアカウントを連携</span>
              </button>
            )}
            <Link
              href="/google/hub"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-mono transition-colors"
            >
              統合ハブを開く →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
