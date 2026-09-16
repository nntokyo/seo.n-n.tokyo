# 12. Google AdSense・広告表示・プライバシー運用

## 1. 方針

SEO Analyzerは個人が趣味で運営するオープンソースのウェブサービスです。サーバーおよびAPIの運営費の一部をGoogle AdSenseの広告収益でまかないます。広告の有無や広告主によって診断結果を変更しません。

## 2. 公開IDと環境変数

AdSenseのパブリッシャーIDは広告タグと`ads.txt`で一般公開される識別子であり、認証用の秘密情報ではありません。ただし、公開リポジトリでサイト固有設定を固定しないため、次の値を本番サーバーの`.env`で管理します。

| 変数 | 形式 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID` | `ca-pub-...` | 全ページへAdSenseスクリプトを出力 |
| `GOOGLE_ADSENSE_PUBLISHER_ID` | `pub-...` | `/ads.txt`の認定販売者行を生成 |
| `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID` | 数字 | SEO Analyzer専用のレスポンシブ広告枠を出力 |

クライアントシークレット、APIキー、支払い情報は広告タグに不要であり、ソースコード、Wiki、ブラウザへ出力しません。

## 3. 実装

- 本番環境で有効なクライアントIDがある場合だけ、Next.jsの`beforeInteractive`スクリプトとしてAdSenseコードを出力します。
- `/ads.txt`は`google.com, pub-..., DIRECT, f08c47fec0942fa0`を`text/plain`で返します。
- PM2設定は本番`.env`の3つのIDをフロントエンドへ明示的に渡します。これにより、ビルド時の広告タグ・広告枠と実行時の`/ads.txt`が同じ設定を参照します。
- トップページから「このサイトについて」と「プライバシーポリシー」へ移動できます。
- サイトマップに運営情報とプライバシーポリシーを含めます。
- `n-n.tokyo`全体へ影響する自動広告は有効化せず、SEO Analyzer専用の手動広告ユニットをトップページに1枠配置します。広告ユニットIDが未設定なら空の広告枠を出力しません。

## 4. 本番導入手順

1. AdSenseの「サイト」で`seo.n-n.tokyo`を追加します。
2. AdSenseでSEO Analyzer専用のレスポンシブ広告ユニットを作成します。
3. 本番サーバーの`.env`に3つの公開IDを設定します。
4. マージ済み`main`をデプロイし、`/`のHTMLにAdSenseスクリプトと広告枠があること、`/ads.txt`がHTTP 200で正しい1行を返すことを確認します。
5. AdSenseでサイト所有権を確認し、審査をリクエストします。
6. 「プライバシーとメッセージ」でGoogle認定CMPの欧州の規制メッセージを設定します。EEA、英国、スイスの利用者に必要な選択肢を表示します。

## 5. 審査と障害対応

- 審査中は広告が表示されないことがあります。審査結果をコードの不具合と断定しません。
- `ads.txt`が未検出の場合、公開URLのHTTPステータス、内容、リダイレクト、robots設定を確認します。Google側の再クロールには時間がかかる場合があります。
- 広告スクリプトがない場合、本番ビルド時に`.env`が読み込まれていることと、クライアントIDが`ca-pub-`形式であることを確認します。
- 同意メッセージや広告設定を変更した場合は、AdSense管理画面の公開状態と実ページの表示を別々に確認します。

## 6. 公式資料

- [AdSenseにサイトを追加する](https://support.google.com/adsense/answer/7584263?hl=ja)
- [自動広告を設定する](https://support.google.com/adsense/answer/9261307?hl=ja)
- [ads.txtガイド](https://support.google.com/adsense/answer/9785052?hl=ja)
- [Google認定CMP要件](https://support.google.com/adsense/answer/13554116?hl=ja)
