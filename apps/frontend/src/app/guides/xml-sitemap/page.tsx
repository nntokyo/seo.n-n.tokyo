import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '../../_components/GuideArticle';

export const metadata: Metadata = {
  title: 'XMLサイトマップの確認方法 — URL・lastmod・canonicalのチェック',
  description: 'XMLサイトマップのURL、lastmod、サイトマップインデックス、canonical整合、Search Console送信前の確認方法を解説。',
  alternates: { canonical: '/guides/xml-sitemap' },
};

export default function Page() {
  return (
    <GuideArticle
      slug="xml-sitemap"
      title="XMLサイトマップの確認方法とよくある問題"
      description="XMLサイトマップは検索エンジンへ重要URLの発見を助ける仕組みです。登録件数だけでなく、URLの正規化、HTTPステータス、canonical、lastmodの整合まで確認する必要があります。"
      toolHref="/tools/sitemap-analyzer"
      toolLabel="XMLサイトマップを分析"
    >
      <section>
        <h2 className="text-xl font-semibold text-white">サイトマップにはインデックスしてほしいURLを載せる</h2>
        <p className="mt-3">
          404、リダイレクト先、noindexページ、重複URLを大量に含めるのではなく、検索結果へ出したい正規URLを中心に掲載します。
          サイトマップは「このURLを必ず登録してほしい」という命令ではなく、URL発見を助けるシグナルです。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">canonicalとの不一致を確認する</h2>
        <p className="mt-3">
          サイトマップのURLがページ内canonicalと別URLを指していると、検索エンジンに異なる正規URL候補を伝えることになります。
          https、www有無、末尾スラッシュ、パラメータ有無を含めて統一します。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">lastmodは実際の更新日に合わせる</h2>
        <p className="mt-3">
          lastmodを毎日機械的に更新しても、本文が変わっていなければ有益ではありません。記事本文、構造化データ、重要なコンテンツなどに意味のある変更があった日時を反映します。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">URLが多い場合はサイトマップインデックスを使う</h2>
        <p className="mt-3">
          大規模サイトでは用途やコンテンツタイプごとにサイトマップを分割し、サイトマップインデックスでまとめると管理しやすくなります。
          どのグループでエラーが発生しているかも追いやすくなります。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">公開後はSearch Consoleでも確認する</h2>
        <p className="mt-3">
          XMLとして正しくても、GoogleがURLを取得・インデックスできるとは限りません。Search Consoleでサイトマップ送信状況とURL検査を確認します。
          SEO全体の確認順序は
          <Link href="/guides/seo-diagnosis" className="ml-1 text-cyan-300 hover:underline">SEO診断のやり方</Link>
          にまとめています。
        </p>
      </section>
    </GuideArticle>
  );
}
