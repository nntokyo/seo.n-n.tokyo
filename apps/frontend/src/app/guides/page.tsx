import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, Search, Layers, Terminal } from 'lucide-react';
import { StructuredData } from '../_components/StructuredData';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.n-n.tokyo';

export const metadata: Metadata = {
  title: 'SEOガイド — 診断・llms.txt・XMLサイトマップの実務解説',
  description: 'SEO診断、llms.txt、XMLサイトマップを実務でどう確認し改善するかを解説するSEOガイド。',
  alternates: { canonical: '/guides' },
};

const guides = [
  {
    href: '/guides/seo-diagnosis',
    title: 'SEO診断のやり方 — 何を確認すればいいか',
    description: 'title、description、canonical、robots、Core Web Vitals、内部リンクまで、SEOチェックの順序を整理します。',
    icon: Search,
  },
  {
    href: '/guides/llms-txt',
    title: 'llms.txtとは？作り方と確認ポイント',
    description: 'llms.txtの役割、書く内容、設置場所、過信しないための注意点を実装目線で解説します。',
    icon: FileText,
  },
  {
    href: '/guides/xml-sitemap',
    title: 'XMLサイトマップの確認方法とよくある問題',
    description: 'URL、lastmod、canonical、サイトマップインデックス、Search Console送信前の確認ポイントをまとめます。',
    icon: Layers,
  },
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100">
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'SEOガイド',
          url: `${siteUrl}/guides`,
          inLanguage: 'ja',
          description: 'SEO診断、llms.txt、XMLサイトマップの実務ガイド。',
        }}
      />

      <header className="border-b border-white/[0.08]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            SEO Analyzer
          </Link>
          <Link href="/tools" className="text-xs text-slate-400 hover:text-cyan-300">ツール一覧</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            SEO GUIDE
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">SEOガイド</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
            検索流入を増やすには、設定項目を増やすより「何が問題かを確認し、優先順位をつけて直す」ことが重要です。
            SEO Analyzerで実際に確認できる項目を中心に、実務で使える手順をまとめています。
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link
                key={guide.href}
                href={guide.href}
                className="group rounded-2xl border border-white/[0.08] bg-[#0F1623] p-5 transition-colors hover:border-cyan-500/30 hover:bg-[#131B2A]"
              >
                <Icon className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                <h2 className="mt-4 text-base font-semibold text-white">{guide.title}</h2>
                <p className="mt-2 text-xs leading-6 text-slate-400">{guide.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-cyan-300">
                  読む
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
