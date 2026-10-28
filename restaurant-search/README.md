# グルメ検索（Android）

食べログ風の検索UIで、評価軸に **Google マップの評価・口コミ** を使う飲食店検索アプリ。
Kotlin + Jetpack Compose、データは Google Places API (New) から取得する。

## 画面構成

| 画面 | 内容 |
|---|---|
| 検索 | エリア・駅 ＋ ジャンル・キーワード入力、「現在地から探す」、ジャンルチップ（ラーメン/寿司/焼肉…） |
| 検索結果 | タブで並び替え（ランキング / 評価が高い順 / 口コミが多い順 / 近い順）、順位バッジ（1〜3位は金銀銅）、★評価・口コミ件数・予算・営業中・距離 |
| 絞り込み | ★評価◯以上、口コミ◯件以上、予算（¥〜¥¥¥¥）、営業中のみ、予約可のみ |
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

## セットアップ

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

- 検索：`rating` / `userRatingCount` を含むため **Text Search Enterprise**。1回の検索で最大3リクエスト（20件×3ページ）
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
