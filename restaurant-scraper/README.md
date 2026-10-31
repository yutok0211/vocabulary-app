# マップめし 飲食店データ収集

飲食店情報を複数のソースから集め、同じ店を1件にまとめて CSV / JSON に出力する。

| ソース | 取得方法 | 件数の目安 | 取れる項目 | 必要なもの |
|---|---|---|---|---|
| **OpenStreetMap** | Overpass API | 都市部は多い、地方は少なめ | 店名・位置・ジャンル・営業時間・電話（登録があれば） | なし |
| **ホットペッパー** | グルメサーチ API | 全国の掲載店 | 店名・住所・位置・ジャンル・平均予算・営業時間 | 無料の API キー |
| 食べログ等の Web ページ | スクレイピング（`crawl`） | 指定した一覧ページ分 | 評価点・件数など | — |

大量に集めるなら、まず API の2つ（`osm` / `hotpepper`）を使う。

## 準備

Python 3.10 以上。

```bash
cd restaurant-scraper
pip install -r requirements.txt      # Windows は py -m pip install -r requirements.txt
```

## 都道府県単位で一括取得（おすすめ）

```bash
# OpenStreetMap（キー不要）
python -m mapmeshi_scraper osm 東京都 神奈川県

# ホットペッパー（キーは https://webservice.recruit.co.jp/ でメール登録すると無料で発行）
python -m mapmeshi_scraper hotpepper 東京都 --key <APIキー>
python -m mapmeshi_scraper hotpepper 東京都 --key <APIキー> --max 200   # お試しで200件だけ

# 47都道府県すべて
python -m mapmeshi_scraper osm 全国
python -m mapmeshi_scraper hotpepper 全国 --key <APIキー>

# 同じ店をまとめて CSV / JSON に出力
python -m mapmeshi_scraper merge
```

- OpenStreetMap は1都道府県あたり1回の問い合わせ。混雑時は 429/504 が返るので数分おいて再実行する。都道府県の間は30秒あける
- ホットペッパーは100件ずつ1秒間隔で取得する。キーは環境変数 `HOTPEPPER_API_KEY` でも指定できる
- 何度実行しても、取得済みの店（同じ URL）は追加されない

### 表示が必要なクレジット

集めたデータを画面や資料に出すときは次を表示する。

- OpenStreetMap: `© OpenStreetMap contributors`（データは ODbL ライセンス）
- ホットペッパー: `Powered by ホットペッパー Webサービス`

## Web ページからの収集（crawl）

1. 各サイトをブラウザで普通に検索し、**検索結果一覧ページの URL** をコピーする（店舗ページの URL でもよい）
2. 収集する

```bash
python -m mapmeshi_scraper crawl "https://tabelog.com/tokyo/A1303/A130301/rstLst/ramen/" \
                                 "https://r.gnavi.co.jp/area/..." --max-pages 3
```

## 出力（`data/`）


| ファイル | 内容 |
|---|---|
| `shops.jsonl` | サイトごとの生データ（1行1店）。crawl を再実行すると取得済みの店は飛ばす |
| `restaurants.csv` | まとめた結果。Excel でそのまま開ける（UTF-8 BOM 付き）。列はソースごとの評価・件数・URL |
| `restaurants.json` | 同じ内容の JSON |

## crawl の仕組み

各サイトが検索エンジン向けにページに埋め込んでいる構造化データ（JSON-LD / schema.org の Restaurant）から読む。
JSON-LD に評価が無いサイトは `sites.py` の CSS セレクタで補う。サイトの HTML が変わって取れなくなったら `sites.py` を直す。

## 禁煙・個室・カウンター席

| ソース | 禁煙・喫煙 | 個室 | カウンター席 |
|---|---|---|---|
| ホットペッパー | ○（`non_smoking`） | ○（`private_room`） | △ 備考に書かれている場合のみ |
| OpenStreetMap | △ `smoking` タグがある店のみ | × | × |
| crawl（店舗ページ） | ○ 「禁煙・喫煙」欄 | ○ 「個室」欄 | ○ 「カウンター」欄、または「空間・設備」に記載 |

表記は次のようにそろえる。

- 禁煙・喫煙：`禁煙`（全面禁煙・店内禁煙）／`分煙`（一部禁煙・喫煙室あり）／`喫煙可`（禁煙席なし）
- 個室・カウンター席：`あり` / `なし`（不明は空欄）

複数ソースにある店は、値が分かっているソースのものを使う。

## 同一店舗の判定（merge）

1. 電話番号が両方にある → 一致すれば同じ店（違えば別の店）
2. 電話番号が片方にしか無い → 店名（空白・括弧内を除いて正規化）が片方に含まれ、かつ位置が 100m 以内

## crawl のアクセスの配慮

- robots.txt を読み、禁止されたページは取得しない。robots.txt を取得できない場合は取得しない
- 同じサイトへのアクセスは 5 秒以上の間隔をあける（`--delay`、最小 3 秒）。robots.txt の Crawl-delay が長ければそちらに従う
- 取得した HTML は `.cache/` に保存し、同じページは取り直さない
- 403 / 429 / 503 が返ったらそのサイトの取得を止める。回避（プロキシ切り替え等）はしない

## 注意

食べログ・ぐるなび等は利用規約で自動収集や転載を制限している。集めたデータの公開・再配布・商用利用は規約違反や
権利侵害になる可能性があるため、個人的な調査・分析の範囲で使うこと。
