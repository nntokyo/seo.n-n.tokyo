import Link from 'next/link';
import {
  ArrowRight,
  FileQuestion,
  Home,
  Search,
  Terminal,
  Wrench,
} from 'lucide-react';

const destinations = [
  {
    href: '/#audit-input',
    title: '無料SEO診断',
    description: 'URLを入力して、クロール・タイトル・構造化データ・HTTPSを確認します。',
    icon: Search,
  },
  {
    href: '/tools',
    title: 'SEOツール一覧',
    description: 'セキュリティレビュー、サイトマップ分析、llms.txtなど目的別のツールを選べます。',
    icon: Wrench,
  },
];

export function NotFoundContent() {
  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100">
      <header className="border-b border-white/[0.08] bg-[#080B11]/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            SEO Analyzer
          </Link>
          <Link
            href="/#audit-input"
            className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            無料診断
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full">
          <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0F1623] px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-cyan-400/10 bg-cyan-400/[0.03]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-36 right-24 h-72 w-72 rounded-full border border-white/[0.04]"
              aria-hidden="true"
            />

            <div className="relative max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs tracking-[0.14em] text-cyan-300">
                <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                HTTP 404 · NOT FOUND
              </div>

              <p className="font-mono text-7xl font-bold tracking-tighter text-white sm:text-8xl">
                404
              </p>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                ページが見つかりません
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                URLが変更されたか、ページが削除された可能性があります。
                アドレスを確認するか、下のリンクから目的の機能へ移動してください。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Home className="h-4 w-4" aria-hidden="true" />
                  トップページへ
                </Link>
                <Link
                  href="/tools"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  SEOツールを見る
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-3 md:grid-cols-2" aria-label="おすすめの移動先">
            {destinations.map((destination) => {
              const Icon = destination.icon;
              return (
                <Link
                  key={destination.href}
                  href={destination.href}
                  className="group flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] p-5 transition hover:border-cyan-400/20 hover:bg-[#131B2A]"
                >
                  <div className="rounded-xl border border-white/[0.08] bg-black/20 p-2.5">
                    <Icon className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-white">{destination.title}</h2>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {destination.description}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}
