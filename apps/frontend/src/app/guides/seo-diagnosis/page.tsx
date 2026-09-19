import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideArticle } from '../../_components/GuideArticle';

export const metadata: Metadata = {
  title: 'SEO診断のやり方 — 無料SEOチェックで見るべき項目',
  description: 'SEO診断で確認すべきtitle、description、canonical、robots、Core Web Vitals、内部リンク、サイトマップを優先順に解説。',
  alternates: { canonical: '/guides/seo-diagnosis' },
};

export default function Page() {
  return (
    <GuideArticle
      slug="seo-diagnosis"
      title="SEO診断のやり方 — 何を確認すればいいか"
      description="SEOチェックは点数を見るだけでは不十分です。クロール可否、検索結果に表示される情報、重複URL、表示速度、内部リンクの順で確認すると、改善の優先順位をつけやすくなります。"
      toolHref="/#audit-input"
      toolLabel="無料SEO診断を実行"
    >
      <section>
        <h2 className="text-xl font-semibold text-white">SEO診断は「インデックスできるか」から確認する</h2>
        <p className="mt-3">
          最初に見るべきなのは検索エンジンがページへ到達できるかです。robots.txtでブロックされていないか、meta robotsにnoindexが入っていないか、HTTPステータスが200か、canonicalが意図したURLを指しているかを確認します。
          内容が良くてもGoogleが取得・登録できなければ検索流入にはつながりません。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">titleとdescriptionはページごとに固有にする</h2>
        <p className="mt-3">
          titleはページの主題を短く具体的に表します。同じサイト内で同一titleを使い回すより、検索者がページの違いを判断できる表現にします。
          descriptionは直接的な順位要因と考えるより、検索結果で内容を理解してもらう説明文として扱うのが実務的です。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">canonicalとサイトマップの整合を見る</h2>
        <p className="mt-3">
          canonicalは正規URLを示すシグナルです。サイトマップに掲載しているURLとcanonicalが食い違う場合、検索エンジンへ矛盾した情報を送ることになります。
          パラメータ付きURLや末尾スラッシュ違い、http/httpsの混在がないかを確認します。
          <Link href="/guides/xml-sitemap" className="ml-1 text-cyan-300 hover:underline">XMLサイトマップの確認方法</Link>
          も合わせて確認してください。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Core Web Vitalsは実測値とラボ値を分ける</h2>
        <p className="mt-3">
          PageSpeed Insightsでは実ユーザーデータとラボ測定値が混在します。LCP、INP、CLSを確認するときは、どのデータを見ているかを区別します。
          数値を上げること自体を目的にせず、表示待ちやレイアウト移動など利用者が感じる問題と結び付けて改善します。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">内部リンクは重要ページまでの距離を見る</h2>
        <p className="mt-3">
          重要なページがトップから何クリックで到達できるか、孤立ページがないか、リンク切れがないかを確認します。
          新しい記事やツールページを公開しても内部リンクがなければ、ユーザーにもクローラーにも発見されにくくなります。
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">診断結果は優先順位をつけて直す</h2>
        <p className="mt-3">
          まずインデックス阻害、次に重複やcanonical、検索結果のtitle/description、内部リンク、表示速度の順に対応すると進めやすくなります。
          SEOスコアを100点にすることではなく、検索者が必要とするページを検索エンジンが正しく発見・理解できる状態にすることが目的です。
        </p>
      </section>
    </GuideArticle>
  );
}
