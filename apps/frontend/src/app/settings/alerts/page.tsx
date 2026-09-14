'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Send,
  Save,
  ShieldAlert,
  Webhook,
  Sliders,
} from 'lucide-react';
import { AlertSettings } from '@seo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AlertsSettingsPage() {
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: true,
    scoreThreshold: 75,
    notifyOnBrokenLinks: true,
    brokenLinkThreshold: 3,
    webhookUrl: '',
    slackChannel: '#seo-alerts',
    emailNotifications: false,
    notificationEmail: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/settings/alerts`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings/alerts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setSettings(updated);
      setMessage({ type: 'success', text: '監視アラート設定を保存しました。' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!settings.webhookUrl) {
      setMessage({ type: 'error', text: 'Webhook URLを入力してからテストを実行してください。' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/projects/global/notify/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.webhookUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage({ type: 'success', text: 'Webhookテスト通知が正常に送信されました！' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Webhook送信テストに失敗しました' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      <header className="border-b border-white/5 bg-[#080B11]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">監視アラート・通知設定 (SCR-22)</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Realtime Monitoring
                </span>
              </div>
              <p className="text-xs text-slate-400">スコア急落や404リンク切れ急増時のSlack/Webhook自動通知トリガー設定</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {message && (
          <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Toggle Card */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>自動監視アラートの有効化</span>
                </h3>
                <p className="text-xs text-slate-400">
                  定期クロールおよび監査実行時に、設定した基準値を下回った場合即座に通知を送信します。
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Threshold Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">スコア低下しきい値</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.scoreThreshold} 点未満で通知</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="95"
                  value={settings.scoreThreshold}
                  onChange={(e) => setSettings({ ...settings, scoreThreshold: Number(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
                <span className="text-[11px] text-slate-500 block">総合SEOスコアがこの数値を下回った際に通知します</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">404リンク切れ急増しきい値</span>
                  <span className="font-mono text-rose-400 font-bold">{settings.brokenLinkThreshold} 件以上で通知</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.brokenLinkThreshold}
                  onChange={(e) => setSettings({ ...settings, brokenLinkThreshold: Number(e.target.value) })}
                  className="w-full accent-rose-500"
                />
                <span className="text-[11px] text-slate-500 block">検出された404リンク切れ数がこの数を超えた場合にアラート</span>
              </div>
            </div>
          </div>

          {/* Webhook & Notification Destination Card */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Webhook className="w-4 h-4 text-violet-400" />
              <span>通知先 Webhook 設定 (Slack / Discord / Teams)</span>
            </h3>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-slate-300">Incoming Webhook URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={settings.webhookUrl}
                  onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  className="flex-1 bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testing}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>テスト送信</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Slackの Incoming Webhooks アプリやDiscordのチャンネル設定で発行されたWebhook URLを入力してください。
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>設定を保存する</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
