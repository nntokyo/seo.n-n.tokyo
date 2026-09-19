import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Terminal } from 'lucide-react';
import { StructuredData } from './StructuredData';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.n-n.tokyo';

export function GuideArticle({
  slug,
  title,
  description,
  children,
  toolHref,
  toolLabel,
}: {
  slug: string;
  title: string;
  description: string;
  children: ReactNode;
  toolHref: string;
  toolLabel: string;
}) {
  const url = `${SITE_URL}/guides/${slug}`;
  const published = '2026-09-19T00:00:00+09:00';

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100">
      <StructuredData
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: title,
            description,
            datePublished: published,
            dateModified: published,
            inLanguage: 'ja',
            mainEntityOfPage: url,
            author: {
              '@type': 'Person',
              name: 'RYO MIURA',
              url: `${SITE_URL}/about`,
            },
            publisher: {
              '@type': 'Organization',
              name: 'SEO Analyzer',
              url: SITE_URL,
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'SEO Analyzer', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'SEOガイド', item: `${SITE_URL}/guides` },
              { '@type': 'ListItem', position: 3, name: title, item: url },
            ],
          },
        ]}
      />

      <header className="border-b border-white/[0.08] bg-[#080B11]/95">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
            <Terminal className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            SEO Analyzer
          </Link>
          <Link href="/guides" className="text-xs text-slate-400 hover:text-cyan-300">
            SEOガイド一覧
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="パンくず" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-cyan-300">トップ</Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-cyan-300">SEOガイド</Link>
          <span>/</span>
          <span className="text-slate-400">{title}</span>
        </nav>

        <article>
          <div className="mb-10 border-b border-white/[0.08] pb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              実務SEOガイド
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
            <p className="mt-4 text-xs text-slate-600">公開日: 2026年9月19日</p>
          </div>

          <div className="guide-prose space-y-8 text-sm leading-8 text-slate-300">
            {children}
          </div>

          <section className="mt-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
            <h2 className="text-lg font-semibold text-white">実際のサイトで確認する</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              ガイドを読むだけでなく、対象URLを実際に分析して問題箇所を確認すると改善点を絞り込めます。
            </p>
            <Link
              href={toolHref}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
            >
              {toolLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </section>

          <div className="mt-10">
            <Link href="/guides" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-300">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              SEOガイド一覧へ戻る
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
