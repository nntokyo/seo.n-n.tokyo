import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'このサイトについて',
  description: 'SEO Analyzerの目的、運営方針、提供ツールおよび公開ソースコードについて説明します。',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0F1623]/90 p-6 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">← SEO Analyzer 総合診断へ戻る</Link>
        <h1 className="mt-8 text-3xl font-bold text-white">このサイトについて</h1>
        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">目的</h2>
            <p className="mt-3">
              SEO Analyzerは、クロール、インデックス、タイトル、構造化データ、HTTPSを確認し、直す順番を出す個人運営のウェブサービスです。順位やAIの引用は予測しません。
              1URLをその場で見る<Link href="/" className="text-cyan-400 hover:text-cyan-300 mx-1">SEO総合診断</Link>をはじめ、
              Google検索では使わない任意ファイルを作る<Link href="/tools/llms-txt" className="text-cyan-400 hover:text-cyan-300 mx-1">llms.txt ツール</Link>や
              <Link href="/tools/sitemap-analyzer" className="text-cyan-400 hover:text-cyan-300 mx-1">XMLサイトマップ解析ツール</Link>などを提供し、開発者とSEO担当者の技術改善を支援しています。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">運営と収益</h2>
            <p className="mt-3">
              運営者はRYO MIURAです。サーバーやAPIなどの運営費の一部を、Google AdSenseによる広告収益でまかないます。広告の有無によって診断結果を変更することはありません。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">オープンソース</h2>
            <p className="mt-3">
              ソースコードと技術資料はMIT Licenseで公開しています。問題の報告や連絡は
              <a className="ml-1 text-cyan-400 hover:text-cyan-300" href="https://github.com/nntokyo/seo.n-n.tokyo/issues" target="_blank" rel="noreferrer">GitHub Issues</a>
              をご利用ください。
            </p>
          </section>
          <section className="border-t border-white/10 pt-6 text-xs text-slate-500 flex items-center justify-between">
            <Link href="/privacy" className="hover:text-cyan-300">プライバシーポリシー</Link>
            <Link href="/" className="hover:text-cyan-300">トップページへ</Link>
          </section>
        </div>
      </article>
    </main>
  );
}
