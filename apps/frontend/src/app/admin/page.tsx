'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sliders,
  Users,
  FolderKanban,
  Activity,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { AdminStatsResponse, AdminUserRecord, ProjectRecord, AuthUser } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AdminPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects'>('overview');

  // 検索・フィルタ
  const [userSearch, setUserSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // ロール変更状態
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAdminData = async () => {
    const token = localStorage.getItem('seo_auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // ユーザーロール照会
      const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      if (meData.user.role !== 'ADMIN') {
        setError('管理者権限(ADMIN)がありません。マイページへ戻ります。');
        setTimeout(() => router.push('/account'), 2000);
        return;
      }

      // 統計情報
      const statsRes = await fetch(`${API_BASE}/api/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // 全ユーザー一覧
      const usersRes = await fetch(`${API_BASE}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      // 全プロジェクト一覧
      const projRes = await fetch(`${API_BASE}/api/v1/admin/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.projects || []);
      }
    } catch (err: any) {
      setError(err.message || 'データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    if (!confirm(`ユーザーの権限を ${newRole} に変更しますか？`)) return;

    setUpdatingUserId(userId);
    setActionSuccess(null);
    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '権限変更に失敗しました');
      }

      setActionSuccess('ユーザー権限を更新しました');
      setTimeout(() => setActionSuccess(null), 3000);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.rootUrl.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(projectSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B11] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error && currentUser?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#080B11] flex items-center justify-center text-slate-400 p-4">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/account"
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>マイページ</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white tracking-tight">プラットフォーム管理コンソール</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10">
                SCR-30
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-mono text-slate-400">
              管理者: <strong className="text-white">{currentUser?.name}</strong>
            </span>
            <button
              onClick={fetchAdminData}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>データ再取得</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              テナント全ユーザー管理、プロジェクト監視、およびシステム全体リソースのモニタリング
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              統計概要
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'users' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ユーザー管理 ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'projects' ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              全プロジェクト ({projects.length})
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 1. Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>登録ユーザー数</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-white">
                  {stats?.totalUsers || 0}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">名</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>認証済: {stats?.verifiedUsers || 0}名 ({stats?.totalUsers ? Math.round(((stats.verifiedUsers || 0) / stats.totalUsers) * 100) : 0}%)</span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>総監視プロジェクト</span>
                  <FolderKanban className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-white">
                  {stats?.totalProjects || 0}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">件</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 pt-1">
                  ユーザー紐付け管理中
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>累計SEO監査実行数</span>
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold font-mono text-white">
                  {stats?.totalAudits || 0}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">回</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 pt-1">
                  永続化ストレージ保存済
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>システム稼働時間</span>
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold font-mono text-white truncate">
                  {stats?.uptimeSeconds
                    ? `${Math.floor(stats.uptimeSeconds / 3600)}h ${Math.floor((stats.uptimeSeconds % 3600) / 60)}m`
                    : '--'}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 pt-1 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>PM2 Node Service Normal</span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Recent System State */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>最近登録されたユーザー</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
                  >
                    すべて表示
                  </button>
                </div>
                <div className="divide-y divide-white/5 text-xs font-mono">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">{u.name}</div>
                        <div className="text-slate-500 text-[11px]">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          u.role === 'ADMIN'
                            ? 'border-violet-500/30 text-violet-400 bg-violet-500/10'
                            : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
                        }`}>
                          {u.role}
                        </span>
                        {u.emailVerified ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-violet-400" />
                    <span>登録プロジェクト</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="text-xs font-mono text-violet-400 hover:underline cursor-pointer"
                  >
                    すべて表示
                  </button>
                </div>
                <div className="divide-y divide-white/5 text-xs font-mono">
                  {projects.slice(0, 5).map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div className="truncate mr-4">
                        <div className="text-white font-bold truncate">{p.name}</div>
                        <div className="text-slate-500 text-[11px] truncate">{p.rootUrl}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${
                          p.lastScore >= 80 ? 'text-emerald-400' : p.lastScore >= 60 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {p.lastScore ? `${p.lastScore}点` : '--'}
                        </span>
                        <div className="text-[10px] text-slate-500">所有者: {p.userId || '未割当'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                  全ユーザー一覧 & 権限付与 ({filteredUsers.length}名)
                </h2>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="ユーザー名・メール・ID検索"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                    <th className="pb-3 px-3">ユーザー</th>
                    <th className="pb-3 px-3">認証方式</th>
                    <th className="pb-3 px-3">メール認証</th>
                    <th className="pb-3 px-3">所有プロジェクト</th>
                    <th className="pb-3 px-3">登録日時</th>
                    <th className="pb-3 px-3">ロール</th>
                    <th className="pb-3 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-slate-500 text-[11px]">{u.email}</div>
                        <div className="text-slate-600 text-[10px]">{u.id}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300">
                          {u.provider}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.emailVerified ? (
                          <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            認証済
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            未認証
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {u.projectCount || 0} 件
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${
                          u.role === 'ADMIN'
                            ? 'border-violet-500/30 text-violet-400 bg-violet-500/10'
                            : 'border-slate-500/30 text-slate-400 bg-slate-500/10'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleRoleChange(u.id, u.role)}
                          disabled={updatingUserId === u.id || u.id === currentUser?.id}
                          className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-violet-500/40 bg-white/5 hover:bg-violet-500/10 text-[11px] text-slate-300 hover:text-violet-300 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {updatingUserId === u.id
                            ? '更新中...'
                            : u.role === 'ADMIN'
                            ? 'MEMBERに降格'
                            : 'ADMINに昇格'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Projects Tab */}
        {activeTab === 'projects' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1623] border border-white/[0.08] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                  システム全プロジェクト監視 ({filteredProjects.length}件)
                </h2>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="プロジェクト名・URL・ID検索"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-black/30 border border-white/5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">{p.id}</span>
                      <span className={`font-bold ${
                        p.lastScore >= 80 ? 'text-emerald-400' : p.lastScore >= 60 ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {p.lastScore ? `${p.lastScore}点` : '未診断'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                    <p className="text-xs font-mono text-slate-400 truncate">{p.rootUrl}</p>
                    <div className="text-[11px] font-mono text-slate-500 pt-1">
                      所有者: <span className="text-slate-300 font-bold">{p.userId || '未割当 (システム)'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-white/5">
                    <span>診断回数: {p.auditCount}回</span>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>推移を開く</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
