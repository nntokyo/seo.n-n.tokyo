'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Globe2,
  Info,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import type {
  SecurityReviewFinding,
  SecurityReviewResult,
  SecurityReviewSeverity,
} from '@seo/shared';

const severityLabels: Record<SecurityReviewSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const severityClasses: Record<SecurityReviewSeverity, string> = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  low: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  info: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

function findingIcon(finding: SecurityReviewFinding) {
  if (!finding.assessed || finding.status === 'unassessed') return <Info className="h-4 w-4 text-slate-400" aria-hidden="true" />;
  if (finding.status === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
  if (finding.severity === 'info') return <Info className="h-4 w-4 text-slate-400" aria-hidden="true" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />;
}

export default function SecurityReviewPage() {
  const [targetUrl, setTargetUrl] = useState('https://seo.n-n.tokyo');
  const [result, setResult] = useState<SecurityReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    let normalized = targetUrl.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/tools/security-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'セキュリティレビューに失敗しました。');
      setResult(data as SecurityReviewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セキュリティレビューに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const issueCount = result
    ? result.summary.critical + result.summary.high + result.summary.medium + result.summary.low
    : 0;

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100">
      <header className="border-b border-white/[0.08] bg-[#080B11]/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/tools" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            ツール一覧
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Passive Security Review
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-emerald-400">Public response review</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">サイトのセキュリティ設定を確認</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            HTTPS、CSP、Cookie属性、CORS、主要セキュリティヘッダー、取得HTML内のmixed contentを確認します。
            攻撃的なpayload、ポートスキャン、認証回避、総当たりは実行しません。
          </p>
        </section>

        <form onSubmit={runReview} className="mt-8 max-w-3xl rounded-2xl border border-white/10 bg-[#0F1623] p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
              <Globe2 className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <input
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                required
                inputMode="url"
                aria-label="レビュー対象URL"
                placeholder="https://example.com"
                className="w-full bg-transparent py-3 text-sm font-mono text-white outline-none placeholder:text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              {isLoading ? '確認中...' : 'セキュリティレビュー'}
            </button>
          </div>
        </form>

        <div aria-live="polite" className="mt-4 max-w-3xl">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {result && (
          <div className="mt-10 space-y-6">
            <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6">
                <p className="text-xs text-slate-500">Security score</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-5xl font-bold text-white">{result.score}</span>
                  <span className="pb-1 text-xl font-semibold text-emerald-400">{result.grade}</span>
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  公開設定の健全性スコアです。侵入耐性や脆弱性不在を保証する値ではありません。
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{result.url}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {issueCount} 件の要対応 / 未評価 {result.summary.unassessed} 件
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    passive / {result.scope.requestCount} request
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(['critical', 'high', 'medium', 'low', 'info'] as SecurityReviewSeverity[]).map((severity) => (
                    <div key={severity} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <p className="text-[10px] uppercase text-slate-500">{severityLabels[severity]}</p>
                      <p className="mt-1 text-xl font-semibold text-white">{result.summary[severity]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#0F1623]">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <h2 className="text-sm font-semibold text-white">確認結果</h2>
                <p className="mt-1 text-xs text-slate-500">事実、リスク、修正案を分離して表示します。</p>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {result.findings.map((finding) => (
                  <article key={finding.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{findingIcon(finding)}</div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{finding.title}</h3>
                          <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                            {finding.category} / {finding.id}
                          </p>
                        </div>
                      </div>
                      <span className={'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ' + severityClasses[finding.severity]}>
                        {!finding.assessed ? 'Unassessed' : finding.status === 'pass' ? 'Pass' : severityLabels[finding.severity]}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-xs leading-6 md:grid-cols-3">
                      <div className="rounded-xl bg-black/20 p-3">
                        <dt className="font-semibold text-slate-300">確認できた事実</dt>
                        <dd className="mt-1 text-slate-500">{finding.evidence}</dd>
                      </div>
                      <div className="rounded-xl bg-black/20 p-3">
                        <dt className="font-semibold text-slate-300">リスク</dt>
                        <dd className="mt-1 text-slate-500">{finding.risk}</dd>
                      </div>
                      <div className="rounded-xl bg-black/20 p-3">
                        <dt className="font-semibold text-slate-300">推奨対応</dt>
                        <dd className="mt-1 text-slate-500">{finding.remediation}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-5 text-xs leading-6 text-slate-400">
              <div className="flex items-start gap-2">
                <Info className="mt-1 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <p>{result.scope.note}</p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
