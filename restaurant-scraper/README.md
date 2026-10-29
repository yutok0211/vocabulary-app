# マップめし スクレイパー

食べログ・ぐるなび・ホットペッパー・Retty から飲食店情報を集め、同じ店を1件にまとめて CSV / JSON に出力する。

## 準備

Python 3.10 以上。

```bash
cd restaurant-scraper
pip install -r requirements.txt      # Windows は py -m pip install -r requirements.txt
```

## 使い方

1. 各サイトをブラウザで普通に検索し、**検索結果一覧ページの URL** をコピーする（店舗ページの URL でもよい）
2. 収集する

```bash
python -m mapmeshi_scraper crawl "https://tabelog.com/tokyo/A1303/A130301/rstLst/ramen/" \
                                 "https://r.gnavi.co.jp/area/..." --max-pages 3
```

3. 同じ店をまとめて出力する

```bash
python -m mapmeshi_scraper merge
```

出力（`data/`）:

| ファイル | 内容 |
|---|---|
| `shops.jsonl` | サイトごとの生データ（1行1店）。crawl を再実行すると取得済みの店は飛ばす |
| `restaurants.csv` | まとめた結果。Excel でそのまま開ける（UTF-8 BOM 付き）。列はサイトごとの評価・件数・URL |
| `restaurants.json` | 同じ内容の JSON |

## 取得する項目

店名・住所・緯度経度・電話番号・ジャンル・予算・評価点・評価件数・営業時間。

各サイトが検索エンジン向けにページに埋め込んでいる構造化データ（JSON-LD / schema.org の Restaurant）から読む。
JSON-LD に評価が無いサイトは `sites.py` の CSS セレクタで補う。サイトの HTML が変わって取れなくなったら `sites.py` を直す。

## 同一店舗の判定

1. 電話番号が両方にある → 一致すれば同じ店（違えば別の店）
2. 電話番号が片方にしか無い → 店名（空白・括弧内を除いて正規化）が片方に含まれ、かつ位置が 100m 以内

## アクセスの配慮

- robots.txt を読み、禁止されたページは取得しない。robots.txt を取得できない場合は取得しない
- 同じサイトへのアクセスは 5 秒以上の間隔をあける（`--delay`、最小 3 秒）。robots.txt の Crawl-delay が長ければそちらに従う
- 取得した HTML は `.cache/` に保存し、同じページは取り直さない
- 403 / 429 / 503 が返ったらそのサイトの取得を止める。回避（プロキシ切り替え等）はしない

## 注意

食べログ・ぐるなび等は利用規約で自動収集や転載を制限している。集めたデータの公開・再配布・商用利用は規約違反や
権利侵害になる可能性があるため、個人的な調査・分析の範囲で使うこと。
