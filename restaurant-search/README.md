# マップめし（Android）

食べログ風の検索UIで、評価軸に **Google マップの評価・口コミ** を使う飲食店検索アプリ。
Kotlin + Jetpack Compose、データは Google Places API (New) から取得する。

## 画面構成

| 画面 | 内容 |
|---|---|
| 検索 | エリア・駅 ＋ ジャンル・キーワード入力、「現在地から探す」、ジャンルチップ（ラーメン/寿司/焼肉…） |
| 検索結果 | タブで並び替え（ランキング / 評価が高い順 / 口コミが多い順 / 近い順）、順位バッジ（1〜3位は金銀銅）、★評価・口コミ件数・予算・営業中・距離 |
| 絞り込み | ★評価◯以上、口コミ◯件以上、予算（¥〜¥¥¥¥）、営業中のみ、予約可のみ、禁煙のみ、個室あり、カウンター席あり |
| 店舗詳細 | 写真カルーセル、評価ボックス、地図・ルート・電話・HPボタン、店舗情報、営業時間、Google の口コミ（最大5件）、Google マップで全口コミを見る |

## 「ランキング」の考え方

Google マップの★は件数の少ない店ほど極端な値になりやすい（★5.0・3件など）。
ランキングタブでは口コミ件数で補正したベイズ平均で並べる。

```
補正スコア = (件数 × ★ + 30 × 3.8) / (件数 + 30)
```

- `3.8`：国内飲食店の Google 評価のおおよその平均（`Scoring.PRIOR_MEAN`）
- `30`：口コミ30件分の重み（`Scoring.PRIOR_WEIGHT`）。大きくすると件数の多い店が上位に来やすくなる

生の★順は「評価が高い順」タブで見られる。

## APK を入手してスマホに入れる（Android Studio 不要）

`restaurant-search/` を変更してプッシュすると、GitHub Actions が APK をビルドする（ワークフロー「Android APK」）。

1. GitHub のリポジトリ →「Actions」→「Android APK」→ 最新の成功した実行を開く
2. 下部の Artifacts から `mapmeshi-debug-apk` をダウンロードし、zip を展開して `app-debug.apk` を取り出す
3. スマホに転送して開く（「提供元不明のアプリ」のインストールを許可する）
4. アプリ右上の「APIキー」で Places API (New) のキーを入力する

API キーを「Android アプリ」で制限する場合は、パッケージ名 `com.example.gurume` と次の SHA-1 を登録する
（リポジトリ内の `app/debug.keystore` で署名しているため、どこでビルドしても同じ値になる）。

```
4A:8E:D2:59:95:9E:1D:D0:13:74:8A:9D:6B:BE:FD:55:DC:77:95:B8
```

リポジトリの Secrets に `PLACES_API_KEY` を登録しておくと、ビルド時にキーが埋め込まれ、アプリでの入力が不要になる。

## 無料枠を超えないための仕組み

アプリ（とブラウザ版）は Google マップ API の呼び出し回数を **検索 / 店舗詳細 / 写真** ごとに月単位で数える。

- 上限の 80% で画面上部に警告、100% で翌月まで Google への問い合わせを止める（集めたデータでの検索は使える）
- 月の区切りは Google の請求月（米国太平洋時間）。日本時間では毎月1日の 16〜17時ごろに 0 回へ戻る
- 上限の初期値は各 1,000 回。「API の利用状況」画面で変更できる
- 数えられるのはその端末・そのブラウザからの呼び出しだけ

### Google Cloud Console 側の上限（確実に止める）

複数の端末で同じキーを使う場合も含めて確実に止めるには、Google 側でも上限を設定する。

1. 「APIとサービス」→「Places API (New)」→「割り当てとシステム上限」
2. 各リクエストの「1日あたり」の上限を編集し、月の無料枠 ÷ 31 程度にする（例：無料枠 1,000 回なら 1日 30 回）
3. 「お支払い」→「予算とアラート」で月の予算（例：1,000円）とメール通知を設定する

## 集めたデータで検索する（禁煙・個室・カウンター席）

Google マップのデータには禁煙・個室・カウンター席の情報が無い。`../restaurant-scraper/` で作った
`restaurants.json` をスマホに保存し、アプリ右上の「データ」→「ファイルを選ぶ」で読み込む。
読み込んだデータは端末に保存され、次回起動時も使える。「絞り込み」の「席・設備」で
禁煙のみ / 個室あり / カウンター席あり を選べる。API キーがあれば、詳細画面で Google の★と口コミを重ねて表示する。

## セットアップ（Android Studio で開発する場合）

1. Android Studio（Ladybug 以降）でこの `restaurant-search/` ディレクトリを開く
2. [Google Cloud Console](https://console.cloud.google.com/) で **Places API (New)** を有効化し、API キーを作成
3. `local.properties.example` を `local.properties` にコピーし、`PLACES_API_KEY` を設定
4. 実機またはエミュレータで実行

### API キーの制限（推奨）

キーはアプリに埋め込まれるため、Cloud Console で次のように制限する。

- アプリケーションの制限：**Android アプリ**（パッケージ名 `com.example.gurume` ＋ 署名証明書の SHA-1）
- API の制限：Places API (New) のみ

REST 呼び出しでは Android 制限キーの照合に `X-Android-Package` / `X-Android-Cert` ヘッダが必要なため、
`ApiKeyInterceptor` で自動付与している。本番運用では自前のバックエンド経由にする方が安全。

## 料金の目安

Places API は取得するフィールドで課金単価（SKU）が決まる。

- 検索：`rating` / `userRatingCount` を含むため **Text Search Enterprise**。1回の検索で1リクエスト（20件）
- 詳細：`reviews` を含むため **Place Details Enterprise + Atmosphere**
- 写真：表示1枚ごとに **Place Photos**

並び替え・絞り込みは取得済みの結果に対して端末側で行うため、API を呼び直さない。
毎月の無料枠と単価は [料金ページ](https://developers.google.com/maps/billing-and-pricing/pricing) を参照。

## 注意事項

- 食べログは UI の参考にしているだけで、食べログのデータは一切使っていない（スクレイピングは食べログの利用規約で禁止）
- Places API の規約により、評価・口コミ・写真には Google の帰属表示と投稿者名の表示が必要（実装済み）。
  また、Places のデータ（place ID 以外）を長期間キャッシュ・保存することは禁止されている
- Places API で取得できる口コミは1店舗あたり最大5件。全件は Google マップアプリへ誘導する

## 構成

```
app/src/main/java/com/example/gurume/
├── data/
│   ├── remote/           Places API (Retrofit)、DTO、DTO→ドメイン変換
│   └── RestaurantRepository.kt
├── domain/               モデル、補正スコア、絞り込み・並び替え（Android 非依存）
├── location/             現在地取得（Fused Location Provider）
├── ui/
│   ├── search/           検索画面、絞り込みシート
│   ├── detail/           店舗詳細
│   └── components/       一覧カード、★表示、帰属表示
├── AppContainer.kt       手動 DI
└── MainActivity.kt       Navigation
```

単体テスト：`./gradlew test`（スコア計算・並び替え・絞り込み・API レスポンスの変換）
