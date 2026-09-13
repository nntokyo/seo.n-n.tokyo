'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  Plus,
  Globe,
  TrendingUp,
  Activity,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Edit2,
  Trash2,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ProjectRecord, AuthUser } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // 作成モーダル
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 編集モーダル
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('seo_auth_token') || '';
    setAuthToken(token);
    const userJson = localStorage.getItem('seo_auth_user');
    if (userJson) {
      try {
        setCurrentUser(JSON.parse(userJson));
      } catch {}
    }
    fetchProjects(token);
  }, []);

  const fetchProjects = async (token?: string) => {
    const t = token !== undefined ? token : authToken;
    try {
      const headers: Record<string, string> = {};
      if (t) headers['Authorization'] = `Bearer ${t}`;

      const res = await fetch(`${API_BASE}/api/v1/projects`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    setIsCreating(true);
    setMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newName, url: newUrl }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        setNewUrl('');
        setMessage({ type: 'success', text: 'プロジェクトを作成しました' });
        fetchProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '作成に失敗しました');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '作成に失敗しました' });
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (p: ProjectRecord, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(p);
    setEditName(p.name);
    setEditUrl(p.rootUrl);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setIsUpdating(true);
    setMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/api/v1/projects/${editingProject.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: editName, rootUrl: editUrl }),
      });
      if (res.ok) {
        setEditingProject(null);
        setMessage({ type: 'success', text: 'プロジェクトを更新しました' });
        fetchProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '更新に失敗しました');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '更新に失敗しました' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`プロジェクト「${name}」を削除してもよろしいですか？\n過去の監査履歴も削除されます。`)) return;

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/api/v1/projects/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'プロジェクトを削除しました' });
        fetchProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '削除に失敗しました');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '削除に失敗しました' });
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
              <FolderKanban className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">プロジェクト管理</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-15
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentUser.name}</span>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>ログインして同期</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-500/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規プロジェクト</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            登録ドメイン & 定期SEO推移管理
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {currentUser
              ? `${currentUser.name}さんのアカウントに紐付けられたプロジェクト一覧です。プロジェクトの作成・編集・削除が可能です。`
              : 'ドメインごとの診断スコア推移、Time-Travel差分比較、過去の監査レポートを一元管理します。'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Project Card Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] hover:border-cyan-500/40 hover:bg-[#121927] transition-all group flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(p, e)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="プロジェクト設定を編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(p.id, p.name, e)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="プロジェクトを削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-2xl font-extrabold font-mono text-white ml-1">
                        {p.lastScore ? `${p.lastScore}点` : '--'}
                      </span>
                    </div>
                  </div>

                  <Link href={`/projects/${p.id}`} className="block group-hover:text-cyan-300">
                    <h3 className="text-base font-bold text-white transition-colors truncate">
                      {p.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 truncate">
                      {p.targetDomain}
                    </p>
                  </Link>
                </div>

                <Link
                  href={`/projects/${p.id}`}
                  className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-500 hover:text-slate-300"
                >
                  <span>監査履歴: {p.auditCount}回</span>
                  <div className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>推移と差分を見る</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 rounded-3xl border border-white/[0.08] bg-[#0F1623] text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
              {currentUser ? <FolderKanban className="w-7 h-7" /> : <Lock className="w-7 h-7 text-cyan-400" />}
            </div>
            {currentUser ? (
              <>
                <h3 className="text-base font-bold text-white">プロジェクトがまだ登録されていません</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  管理したいWebサイトのURLを登録して、定期的なスコア推移や履歴差分をトラッキングしましょう。
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>新規プロジェクトを作成</span>
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">プロジェクト管理にはログインが必要です</h3>
                  <span className="text-[11px] font-mono text-cyan-400">🛡️ 世界公開システムにおけるプライバシー保護規約</span>
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  本システムは全世界に公開されているため、登録ドメインや内部監査データは他の利用者に一切公開されないよう暗号化・アカウント分離されています。
                  プロジェクトの作成・管理を行うには、無料アカウントにログインしてください。
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Link
                    href="/login"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono inline-flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <User className="w-4 h-4" />
                    <span>ログイン / アカウント作成</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0F1623] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">新規プロジェクト作成</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-500 hover:text-white text-xs font-mono"
                >
                  ✕ 閉じる
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">プロジェクト名 (任意)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例: 自社オウンドメディア"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">対象ドメインURL (必須)</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating || !newUrl}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? '作成中...' : '登録する'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingProject && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0F1623] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">プロジェクト設定の編集</h3>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="text-slate-500 hover:text-white text-xs font-mono"
                >
                  ✕ 閉じる
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">プロジェクト名称</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">対象ドメインURL</label>
                  <input
                    type="text"
                    required
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdating ? '保存中...' : '変更を保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
