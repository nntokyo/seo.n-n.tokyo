import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | SEO Analyzer',
  description: 'SEO Analyzerにおけるアクセス解析、広告、入力データの取り扱いを説明します。',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0F1623]/90 p-6 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">← SEO Analyzerへ戻る</Link>
        <h1 className="mt-8 text-3xl font-bold text-white">プライバシーポリシー</h1>
        <p className="mt-3 text-xs text-slate-500">制定日: 2026年9月15日</p>
        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">取得する情報</h2>
            <p className="mt-3">
              本サイトは、サービス提供と改善のため、診断対象として入力されたURL、アクセス日時、閲覧ページ、端末・ブラウザ情報、IPアドレス等を取得することがあります。パスワードや決済情報を診断欄へ入力しないでください。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Google Analytics</h2>
            <p className="mt-3">
              利用状況の把握にGoogle Analyticsを使用します。GoogleはCookie等を用いて利用情報を収集する場合があります。データの取り扱いはGoogleのポリシーに基づきます。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Google AdSense</h2>
            <p className="mt-3">
              広告配信にGoogle AdSenseを使用します。Googleやそのパートナーは、Cookie、端末識別子等を使用して、閲覧履歴や関心に基づく広告、またはパーソナライズされていない広告を表示する場合があります。対象地域では、同意管理画面から選択を変更できます。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">第三者への送信と外部サービス</h2>
            <p className="mt-3">
              診断機能の提供に必要な範囲で、入力URLや解析結果の一部をGoogleの各種APIへ送信することがあります。法令に基づく場合を除き、取得情報を目的外で販売しません。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">Cookieの管理</h2>
            <p className="mt-3">
              Cookieはブラウザの設定で削除または拒否できます。拒否した場合、一部の機能や広告表示が正常に動作しないことがあります。Googleによる広告データの利用については
              <a className="ml-1 text-cyan-400 hover:text-cyan-300" href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noreferrer">Googleの広告ポリシー</a>
              をご確認ください。
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">保管・安全管理・問い合わせ</h2>
            <p className="mt-3">
              取得情報は利用目的に必要な期間だけ保管し、合理的な安全管理措置を講じます。開示、訂正、削除等の相談や本ポリシーへの問い合わせは
              <a className="ml-1 text-cyan-400 hover:text-cyan-300" href="https://github.com/nntokyo/seo.n-n.tokyo/issues" target="_blank" rel="noreferrer">GitHub Issues</a>
              へお寄せください。
            </p>
          </section>
          <section className="border-t border-white/10 pt-6 text-xs text-slate-500">
            運営者: RYO MIURA / SEO Analyzer
          </section>
        </div>
      </article>
    </main>
  );
}
