'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Chrome,
} from 'lucide-react';
import { AuthUser, AuthTokenResponse } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google OAuth コールバック検出 (?code=xxx&provider=google)
  useEffect(() => {
    const code = searchParams.get('code');
    const provider = searchParams.get('provider');

    if (code && provider === 'google') {
      setGoogleLoading(true);
      setError(null);

      const redirectUri = window.location.origin + '/login?provider=google';

      fetch(`${API_BASE}/api/v1/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data: AuthTokenResponse) => {
          localStorage.setItem('seo_auth_token', data.token);
          localStorage.setItem('seo_auth_user', JSON.stringify(data.user));
          setSuccessMsg(`ようこそ、${data.user.name}さん！ログインしました。`);
          setTimeout(() => {
            router.push('/projects');
          }, 1200);
        })
        .catch((err: any) => {
          setError(err.message || 'Googleログインの処理中にエラーが発生しました');
        })
        .finally(() => {
          setGoogleLoading(false);
        });
    }
  }, [searchParams, router]);

  // メール＋パスワードの送信 (ログイン or 新規登録)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const payload = mode === 'login' ? { email, password } : { email, password, name };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '認証に失敗しました');
      }

      const authData = data as AuthTokenResponse;
      localStorage.setItem('seo_auth_token', authData.token);
      localStorage.setItem('seo_auth_user', JSON.stringify(authData.user));

      setSuccessMsg(
        mode === 'login'
          ? `おかえりなさい、${authData.user.name}さん！`
          : `アカウント登録が完了しました。ようこそ、${authData.user.name}さん！`
      );

      setTimeout(() => {
        router.push('/projects');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'ログイン処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Googleログインボタン押下
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const redirectUri = window.location.origin + '/login?provider=google';
      const res = await fetch(`${API_BASE}/api/v1/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Google認証URLの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'Google認証の開始に失敗しました');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#080B11] rounded-[10px] flex items-center justify-center">
              <Terminal className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">SEO Analyzer</span>
        </Link>
        <h2 className="text-xl font-bold text-white tracking-tight">
          {mode === 'login' ? 'アカウントにログイン' : '新規アカウント作成'}
        </h2>
        <p className="text-xs text-slate-400">
          {mode === 'login' ? '登録済みのメールまたはGoogleアカウントでサインイン' : '無料でアカウントを作成して全診断・分析機能を利用'}
        </p>
      </div>

      {/* Main Form Box */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {googleLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.41 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.59 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>Googleでログイン</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap px-1">またはメールアドレスで</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login' ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register' ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            新規登録
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="block text-xs font-mono text-slate-400">お名前 / ニックネーム</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="田中 太郎"
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-mono text-slate-400">メールアドレス</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-mono text-slate-400">パスワード</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            {mode === 'register' && (
              <span className="text-[10px] text-slate-500">6文字以上の安全なパスワードを入力してください</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'ログインする' : 'アカウントを作成する'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
          ← トップページへ戻る
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex items-center justify-center px-4 py-12 selection:bg-cyan-500/30">
      <Suspense fallback={<div className="text-slate-400 text-xs font-mono">読み込み中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
