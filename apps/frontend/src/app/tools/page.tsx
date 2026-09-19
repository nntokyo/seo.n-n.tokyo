import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  FileText,
  FolderKanban,
  Gauge,
  Layers,
  Network,
  Search,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { AdSenseUnit } from '../_components/AdSenseUnit';

export const metadata: Metadata = {
  title: 'SEO・AI検索ツール一覧',
  description: 'SEO総合診断、サイトマップ分析、ディープクロール、llms.txt生成、Google公式API連携を目的別に選べるツール一覧です。',
  alternates: { canonical: '/tools' },
};

const groups = [
  {
    title: 'まず診断',
    description: 'URLを1つ入力して、現在のSEO状態と改善ポイントを把握します。',
    items: [
      {
        href: '/#audit-input',
        title: 'SEO総合診断',
        description: '技術SEO、メタ情報、Core Web Vitals、AI検索対応を横断して確認。',
        icon: Search,
        accent: 'text-cyan-400',
      },
    ],
  },
  {
    title: '技術SEO',
    description: 'クロールやサイト構造を深く調べたいときに使うツールです。',
    items: [
      {
        href: '/tools/sitemap-analyzer',
        title: 'サイトマップ分析',
        description: 'XML Sitemap、更新頻度、URL構造、canonical候補を検証。',
        icon: Layers,
        accent: 'text-sky-400',
      },
      {
        href: '/crawl/new',
        title: 'ディープクロール',
        description: '内部リンク、孤立ページ、リンク切れ、クリック深度をサイト全体で分析。',
        icon: Network,
        accent: 'text-cyan-400',
      },
    ],
  },
  {
    title: 'AI検索対応',
    description: 'AIクローラーやGoogle公式データを使った改善に進みます。',
    items: [
      {
        href: '/tools/llms-txt',
        title: 'llms.txt生成',
        description: 'AIクローラー向けのサイト案内ファイルを生成し、そのまま配置可能。',
        icon: FileText,
        accent: 'text-violet-400',
      },
      {
        href: '/google/hub',
        title: 'Google公式API / Gemini',
        description: 'PageSpeed、Search Console、GA4とGemini改善提案を1画面で確認。',
        icon: ShieldCheck,
        accent: 'text-emerald-400',
      },
    ],
  },
  {
    title: '継続運用',
    description: '単発診断ではなく、履歴を残して改善を続けるための機能です。',
    items: [
      {
        href: '/projects',
        title: 'プロジェクト管理',
        description: '監査履歴、スコア推移、Google設定などをサイト単位で管理。',
        icon: FolderKanban,
        accent: 'text-amber-400',
      },
    ],
  },
];

export default function ToolsPage() {
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
            className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
          >
            無料診断
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            目的から選ぶ
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">SEO・AI検索ツール</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
            まず総合診断で問題を見つけ、必要に応じてサイトマップ、クロール、llms.txt、Google公式データへ進めます。
            機能名ではなく、やりたいことから選べるように整理しています。
          </p>
        </section>

        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`tools-${group.title}`}>
              <div className="mb-4">
                <h2 id={`tools-${group.title}`} className="text-lg font-semibold text-white">{group.title}</h2>
                <p className="mt-1 text-xs leading-6 text-slate-500">{group.description}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-[#0F1623] p-5 transition-colors hover:border-white/20 hover:bg-[#131B2A]"
                    >
                      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-2.5">
                        <Icon className={`h-5 w-5 ${item.accent}`} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400" aria-hidden="true" />
                        </div>
                        <p className="mt-2 text-xs leading-6 text-slate-400">{item.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8" aria-labelledby="learn-seo">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0F1623] p-6">
          <h2 id="learn-seo" className="text-lg font-semibold text-white">使い方を先に確認したい方へ</h2>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            診断結果の読み方や、llms.txt・XMLサイトマップをどう運用するかはSEOガイドで解説しています。
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/guides/seo-diagnosis" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">SEO診断のやり方</Link>
            <Link href="/guides/llms-txt" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">llms.txtの作り方</Link>
            <Link href="/guides/xml-sitemap" className="rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300">XMLサイトマップ確認</Link>
          </div>
        </div>
      </section>

      <AdSenseUnit placement="tools" className="mt-4" />

      <footer className="border-t border-white/[0.08] px-4 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4">
          <Link href="/" className="hover:text-cyan-300">トップ</Link>
          <Link href="/about" className="hover:text-cyan-300">このサイトについて</Link>
          <Link href="/privacy" className="hover:text-cyan-300">プライバシー</Link>
        </div>
      </footer>
    </div>
  );
}
