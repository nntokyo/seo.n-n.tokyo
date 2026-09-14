'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Terminal,
  Code2,
} from 'lucide-react';
import { ApiKeyRecord } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchKeys = () => {
    fetch(`${API_BASE}/api/v1/settings/api-keys`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setKeys(data.keys || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName, scopes: ['read', 'write'] }),
      });
      const data: ApiKeyRecord = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (data.fullKey) {
        setCreatedKey(data.fullKey);
      }
      setKeyName('');
      fetchKeys();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'APIキーの発行に失敗しました' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('このAPIキーを失効させますか？このキーを使用した外部スクリプトやCI/CDは即座に停止します。')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings/api-keys/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
        setMessage({ type: 'success', text: 'APIキーを失効させました' });
      }
    } catch {}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      <header className="border-b border-white/5 bg-[#080B11]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">APIキー & Webhook管理 (SCR-25)</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Developer API
                </span>
              </div>
              <p className="text-xs text-slate-400">CI/CDパイプラインや外部システムからSEO監査APIを呼び出すためのアクセストークン</p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowModal(true);
              setCreatedKey(null);
            }}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新規APIキーを発行</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* API Key Table */}
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">アクティブなAPIキー ({keys.length}件)</span>
          </div>

          <div className="divide-y divide-white/5">
            {keys.map((k) => (
              <div key={k.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{k.name}</span>
                      <code className="text-xs font-mono text-cyan-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                        {k.keyPrefix}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                      <span>スコープ: {k.scopes.join(', ')}</span>
                      <span>•</span>
                      <span>作成: {new Date(k.createdAt).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRevoke(k.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="キーを失効"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Example cURL Snippet */}
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono uppercase font-semibold">APIリクエスト サンプルコード (cURL)</h3>
          </div>
          <pre className="bg-black/60 p-4 rounded-xl text-xs font-mono text-cyan-300 border border-white/5 overflow-x-auto">
{`curl -X POST https://seo.n-n.tokyo/api/v1/audit/quick \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
          </pre>
        </div>

        {/* Key Generation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">新規APIキーの発行</h3>

              {createdKey ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>このキーは二度と表示されません。安全な場所に保存してください。</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdKey}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(createdKey)}
                      className="p-2 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-colors cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-slate-400">キー名称（識別用）</label>
                    <input
                      type="text"
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="GitHub Actions CI/CD"
                      className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>トークンを発行</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
