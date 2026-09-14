import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'このサイトについて | SEO Analyzer',
  description: 'SEO Analyzerの目的、運営方針、公開ソースコードについて説明します。',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0F1623]/90 p-6 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">← SEO Analyzerへ戻る</Link>
        <h1 className="mt-8 text-3xl font-bold text-white">このサイトについて</h1>
        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">目的</h2>
            <p className="mt-3">
              SEO Analyzerは、技術的SEO、Core Web Vitals、Google公式API、AI検索への対応状況を一か所で確認するための個人運営のウェブサービスです。趣味のオープンソースプロジェクトとして開発し、実用的な診断ツールとして継続的に改善しています。
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
          <section className="border-t border-white/10 pt-6 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-cyan-300">プライバシーポリシー</Link>
          </section>
        </div>
      </article>
    </main>
  );
}
