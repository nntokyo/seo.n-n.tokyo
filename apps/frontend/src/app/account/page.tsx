'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  FolderKanban,
  Lock,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Key,
  ShieldAlert,
  Send,
  Sliders,
} from 'lucide-react';
import { AuthUser, ProjectRecord } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // プロファイル編集
  const [nameInput, setNameInput] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // メールアドレス変更
  const [newEmailInput, setNewEmailInput] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // メール認証コード入力 & 再送信
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const fetchUserData = async () => {
    const token = localStorage.getItem('seo_auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // ユーザー照会
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        localStorage.removeItem('seo_auth_token');
        localStorage.removeItem('seo_auth_user');
        router.push('/login');
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setNameInput(data.user.name || '');

      // 所有プロジェクト一覧照会
      const projRes = await fetch(`${API_BASE}/api/v1/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.projects || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // プロファイル表示名更新
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setIsUpdatingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const res = await fetch(`${API_BASE}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nameInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'プロファイルの更新に失敗しました');
      }

      const result = await res.json();
      setUser(result.user);
      localStorage.setItem('seo_auth_user', JSON.stringify(result.user));
      setProfileSuccess('表示名を更新しました');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || '更新に失敗しました');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // メールアドレス変更リクエスト
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput.trim()) return;

    setIsUpdatingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);
    setVerificationNotice(null);

    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const res = await fetch(`${API_BASE}/api/v1/auth/email`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newEmail: newEmailInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'メールアドレスの変更に失敗しました');
      }

      const result = await res.json();
      setEmailSuccess(result.message || 'メールアドレスを変更しました。認証コードを入力してください。');
      if (result.verificationCode) {
        setVerificationNotice(`認証コードを発行しました: ${result.verificationCode}`);
      }
      setNewEmailInput('');
      await fetchUserData();
    } catch (err: any) {
      setEmailError(err.message || 'メールアドレスの変更に失敗しました');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // メール認証コード検証
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput.trim()) return;

    setIsVerifyingCode(true);
    setVerificationError(null);

    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const res = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCodeInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '認証コードの検証に失敗しました');
      }

      const result = await res.json();
      setUser(result.user);
      localStorage.setItem('seo_auth_user', JSON.stringify(result.user));
      setVerificationCodeInput('');
      setVerificationNotice('メールアドレスの認証が正常に完了しました！すべてのプロジェクト機能をご利用いただけます。');
      setTimeout(() => setVerificationNotice(null), 5000);
      await fetchUserData();
    } catch (err: any) {
      setVerificationError(err.message || '認証コードが正しくありません');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 認証コード再送信
  const handleResendVerification = async () => {
    setIsResendingCode(true);
    setVerificationError(null);
    setVerificationNotice(null);

    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const res = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '認証コードの再送信に失敗しました');
      }

      const result = await res.json();
      if (result.verificationCode) {
        setVerificationNotice(`新しい認証コードを発行しました: ${result.verificationCode}`);
      } else {
        setVerificationNotice('新しい認証コードを送信しました。');
      }
    } catch (err: any) {
      setVerificationError(err.message || '再送信に失敗しました');
    } finally {
      setIsResendingCode(false);
    }
  };

  // パスワード変更
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setPassError('新しいパスワードと確認用パスワードが一致しません');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('新しいパスワードは6文字以上で指定してください');
      return;
    }

    setIsChangingPass(true);
    setPassSuccess(null);
    setPassError(null);

    try {
      const token = localStorage.getItem('seo_auth_token') || '';
      const res = await fetch(`${API_BASE}/api/v1/auth/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'パスワードの変更に失敗しました');
      }

      setPassSuccess('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(null), 3000);
    } catch (err: any) {
      setPassError(err.message || 'パスワード変更に失敗しました');
    } finally {
      setIsChangingPass(false);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    const token = localStorage.getItem('seo_auth_token') || '';
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}

    localStorage.removeItem('seo_auth_token');
    localStorage.removeItem('seo_auth_user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B11] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
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
              href="/projects"
              className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>プロジェクト一覧</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-tight">マイページ & アカウント設定</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                SCR-29
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors shadow-sm shadow-violet-500/10"
              >
                <Sliders className="w-3.5 h-3.5 text-violet-400" />
                <span>プラットフォーム管理画面</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        {/* Email Verification Banner if Unverified */}
        {!user?.emailVerified && (
          <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-200 space-y-4 shadow-lg shadow-amber-500/5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-300">
                  メールアドレスが未認証です（プロジェクト機能制限中）
                </h3>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  不正アクセス防止およびセキュリティ保護のため、メールアドレス認証が完了するまで新規プロジェクト作成・編集・削除・詳細照会が制限されます。
                  発行された6桁の認証コードを入力して認証を完了してください。
                </p>
              </div>
            </div>

            {verificationNotice && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>{verificationNotice}</span>
              </div>
            )}

            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verificationError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <input
                type="text"
                value={verificationCodeInput}
                onChange={(e) => setVerificationCodeInput(e.target.value)}
                placeholder="6桁の認証コードを入力 (例: 123456)"
                maxLength={6}
                className="w-full sm:w-64 px-4 py-2.5 rounded-xl bg-black/50 border border-amber-500/40 text-white placeholder-slate-500 text-xs font-mono text-center tracking-widest focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isVerifyingCode || !verificationCodeInput.trim()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isVerifyingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>認証コードを検証する</span>
              </button>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingCode}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isResendingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>認証コードを再発行</span>
              </button>
            </form>
          </div>
        )}

        {/* Profile Card */}
        <section className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-extrabold text-2xl font-mono shadow-lg shadow-cyan-500/10">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">{user?.name}</h1>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border border-violet-500/30 text-violet-400 bg-violet-500/10 font-bold">
                    {user?.role === 'ADMIN' ? 'スーパー管理者 (ADMIN)' : 'メンバー (MEMBER)'}
                  </span>
                  {user?.emailVerified ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      メール認証済
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      未認証
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 space-y-1 sm:text-right">
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-500">認証方式:</span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-bold">
                  {user?.provider === 'GOOGLE' ? 'Google OAuth' : 'メール/パスワード'}
                </span>
              </div>
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>登録日: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '--'}</span>
              </div>
            </div>
          </div>

          {/* Edit Display Name */}
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              アカウント表示名の変更
            </h2>

            {profileError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="表示名を入力"
                className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUpdatingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
                <span>表示名を保存</span>
              </button>
            </div>
          </form>

          {/* Edit Email Address */}
          <form onSubmit={handleUpdateEmail} className="space-y-3 pt-4 border-t border-white/5">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              メールアドレスの変更
            </h2>
            <p className="text-[11px] text-slate-400">
              ※ メールアドレスを変更すると一時的に未認証状態となります。変更後に新しい確認コードを入力してください。
            </p>

            {emailError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="新しいメールアドレス (例: new@example.com)"
                className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isUpdatingEmail || !newEmailInput.trim()}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUpdatingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                <span>メールアドレスを変更</span>
              </button>
            </div>
          </form>
        </section>

        {/* Password Change Card (Only for Local users) */}
        {user?.provider === 'LOCAL' && (
          <section className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                セキュリティ & パスワード変更
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              定期的なパスワードの変更を推奨します。6文字以上の安全なパスワードを入力してください。
            </p>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg text-xs font-mono">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">現在のパスワード</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">新しいパスワード (6文字以上)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">新しいパスワード (確認用)</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isChangingPass ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5 text-cyan-400" />}
                <span>パスワードを更新する</span>
              </button>
            </form>
          </section>
        )}

        {/* Connected Projects Summary */}
        <section className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0F1623] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                所有・監視中プロジェクト ({projects.length}件)
              </h2>
            </div>
            <Link
              href="/projects"
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>プロジェクト一覧を開く</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">{p.id}</span>
                      <span className={`text-sm font-bold font-mono ${
                        p.lastScore >= 80 ? 'text-emerald-400' : p.lastScore >= 60 ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {p.lastScore ? `${p.lastScore}点` : '--'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                      {p.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{p.rootUrl}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
                    <span>診断回数: {p.auditCount}回</span>
                    <span className="text-cyan-400 flex items-center gap-0.5">
                      詳細 <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-black/20 border border-white/5 text-center space-y-3">
              <p className="text-xs font-mono text-slate-400">現在紐付けられているプロジェクトはありません。</p>
              <Link
                href="/projects"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono inline-flex items-center gap-1.5 transition-colors"
              >
                <span>最初のプロジェクトを作成する</span>
              </Link>
            </div>
          )}
        </section>

        {/* Google Integrations Shortcut */}
        <section className="p-6 rounded-3xl border border-white/[0.08] bg-[#0F1623] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google API アカウント連携管理</h3>
              <p className="text-xs text-slate-400">Search Console、GA4、PSI、Gemini APIの全体連携ステータスを確認します。</p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>連携設定を開く</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
