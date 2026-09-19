import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '../../_components/GuideArticle';

export const metadata: Metadata = {
  title: 'llms.txtとは？作り方・設置場所・確認ポイント',
  description: 'llms.txtの役割、書く内容、設置場所、生成方法、AIクローラー対策として過信しないための注意点を実務向けに解説。',
  alternates: { canonical: '/guides/llms-txt' },
};

export default function Page() {
  return (
    <GuideArticle
      slug="llms-txt"
      title="llms.txtとは？作り方と確認ポイント"
      description="llms.txtはAIシステムへサイトの主要情報を伝えるために提案されているテキスト形式です。従来のrobots.txtやXMLサイトマップとは役割が異なるため、既存SEOの代替としてではなく補助情報として扱います。"
      toolHref="/tools/llms-txt"
      toolLabel="llms.txtを生成"
    >
      <section>
        <h2 className="text-xl font-semibold text-white">llms.txtの役割</h2>
        <p className="mt-3">
          llms.txtは、サイトの概要や重要なドキュメントへのリンクを、人間が読みやすいMarkdown形式に近い形でまとめる考え方です。
          AIクローラーへ「このサイトで何が重要か」を伝える補助情報として利用できます。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">robots.txtやsitemap.xmlとは別物</h2>
        <p className="mt-3">
          robots.txtはクロール許可・拒否のルール、XMLサイトマップは発見してほしいURLの一覧を伝える仕組みです。
          llms.txtはこれらを置き換えません。検索エンジンのインデックス対策では、まずrobots、canonical、内部リンク、XMLサイトマップを優先します。
          <Link href="/guides/xml-sitemap" className="ml-1 text-cyan-300 hover:underline">サイトマップの確認方法</Link>
          も参照してください。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">何を書くか</h2>
        <p className="mt-3">
          サイト名、短い説明、主要なドキュメントや機能ページへのリンクを簡潔にまとめます。検索順位を狙って同じキーワードを繰り返すのではなく、実際に重要なページを選ぶことが重要です。
          更新されなくなったURLやログイン必須ページを大量に並べる必要はありません。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">設置場所と確認</h2>
        <p className="mt-3">
          一般にはサイトルートの <code className="rounded bg-black/40 px-1.5 py-0.5 text-cyan-300">/llms.txt</code> で取得できる状態を想定します。
          公開後はブラウザやcurlで200レスポンスになるか、文字化けがないか、リンク先が実在するかを確認します。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">llms.txtだけでAI引用は保証されない</h2>
        <p className="mt-3">
          AI回答への引用や検索順位はllms.txtだけで決まりません。本文の品質、公開情報の明確さ、内部リンク、技術SEO、外部からの評価など複数要素が関係します。
          llms.txtはサイト構造を説明する一手段として使い、通常のSEO改善と並行して運用します。
        </p>
      </section>
    </GuideArticle>
  );
}
