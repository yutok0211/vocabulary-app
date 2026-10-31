"""
使い方:
  python -m mapmeshi_scraper osm 東京都
  python -m mapmeshi_scraper hotpepper 東京都 --key <APIキー>
  python -m mapmeshi_scraper crawl "<検索結果ページの URL>" [...] --max-pages 3
  python -m mapmeshi_scraper merge
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import sys
import time
from pathlib import Path

from .fetch import DEFAULT_UA, Blocked, Fetcher
from .merge import merge
from .parse import Shop, next_page, parse_shop, shop_links
from .prefectures import PREFECTURES, resolve
from .sites import SITES, normalize_shop_url, site_for
from .sources import fetch_hotpepper, fetch_osm

log = logging.getLogger("mapmeshi_scraper")


def crawl(args) -> int:
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    fetcher = Fetcher(Path(args.cache), delay=args.delay, user_agent=args.user_agent, use_cache=not args.no_cache)
    raw_path = out / "shops.jsonl"
    done = set()
    if raw_path.exists():
        for line in raw_path.read_text(encoding="utf-8").splitlines():
            done.add(json.loads(line)["url"])

    with raw_path.open("a", encoding="utf-8") as f:
        for start in args.urls:
            site = site_for(start)
            if not site:
                log.error("未対応のサイトです: %s（対応: %s）", start, ", ".join(s.label for s in SITES))
                continue
            try:
                for shop_url in collect_shop_urls(fetcher, start, site, args.max_pages):
                    if shop_url in done:
                        continue
                    html = fetcher.get(shop_url)
                    shop = parse_shop(html, shop_url, site) if html else None
                    if not shop:
                        continue
                    f.write(json.dumps(shop.to_dict(), ensure_ascii=False) + "\n")
                    f.flush()
                    done.add(shop_url)
                    log.info("[%s] %s  評価=%s (%s件)", site.label, shop.name, shop.rating, shop.rating_count)
            except Blocked as e:
                log.error("取得を中止しました: %s", e)
    log.info("保存先: %s", raw_path)
    return 0


def load_done(raw_path: Path) -> set[str]:
    if not raw_path.exists():
        return set()
    return {json.loads(l)["url"] for l in raw_path.read_text(encoding="utf-8").splitlines() if l.strip()}


def save_shops(out: Path, shops, label: str) -> int:
    """取得済み（同じ URL）の店は飛ばして shops.jsonl に追記する。"""
    out.mkdir(parents=True, exist_ok=True)
    raw_path = out / "shops.jsonl"
    done = load_done(raw_path)
    added = skipped = 0
    with raw_path.open("a", encoding="utf-8") as f:
        try:
            for shop in shops:
                if shop.url in done:
                    skipped += 1
                    continue
                f.write(json.dumps(shop.to_dict(), ensure_ascii=False) + "\n")
                done.add(shop.url)
                added += 1
                if added % 1000 == 0:
                    log.info("  %d件...", added)
        except Blocked as e:
            log.error("取得を中止しました: %s", e)
    log.info("%s: %d件を追加（取得済み %d件は省略） → %s", label, added, skipped, raw_path)
    return added


def cmd_osm(args) -> int:
    prefs = PREFECTURES if args.pref == ["全国"] else [resolve(p) for p in args.pref]
    for i, pref in enumerate(prefs):
        save_shops(Path(args.out), fetch_osm(pref), f"OpenStreetMap {pref}")
        if i < len(prefs) - 1:
            time.sleep(30)  # Overpass API の公開サーバーに負荷をかけないよう間をあける
    return 0


def cmd_hotpepper(args) -> int:
    key = args.key or os.environ.get("HOTPEPPER_API_KEY")
    if not key:
        log.error("APIキーを --key か環境変数 HOTPEPPER_API_KEY で指定してください（https://webservice.recruit.co.jp/ で無料発行）")
        return 1
    prefs = PREFECTURES if args.pref == ["全国"] else [resolve(p) for p in args.pref]
    for pref in prefs:
        save_shops(Path(args.out), fetch_hotpepper(key, pref, max_shops=args.max), f"ホットペッパー {pref}")
    return 0


def collect_shop_urls(fetcher: Fetcher, start: str, site, max_pages: int):
    direct = normalize_shop_url(start, site)
    if direct:
        yield direct
        return
    url, seen = start, set()
    for page in range(max_pages):
        if not url or url in seen:
            break
        seen.add(url)
        html = fetcher.get(url)
        if not html:
            break
        links = shop_links(html, url, site)
        log.info("[%s] 一覧 %dページ目: %d店", site.label, page + 1, len(links))
        yield from links
        url = next_page(html, url)


def do_merge(args) -> int:
    out = Path(args.out)
    raw = out / "shops.jsonl"
    if not raw.exists():
        log.error("%s がありません。先に crawl を実行してください。", raw)
        return 1
    shops = [Shop(**json.loads(l)) for l in raw.read_text(encoding="utf-8").splitlines() if l.strip()]
    merged = merge(shops)
    (out / "restaurants.json").write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")

    site_keys = [s.key for s in SITES]
    with (out / "restaurants.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        yn = {True: "あり", False: "なし", None: ""}
        w.writerow(["店名", "住所", "電話", "ジャンル", "予算", "営業時間", "禁煙・喫煙", "個室", "カウンター席", "緯度", "経度"]
                   + [f"{s.label}_評価" for s in SITES] + [f"{s.label}_件数" for s in SITES]
                   + [f"{s.label}_URL" for s in SITES])
        for m in merged:
            src = m["sources"]
            w.writerow([m["name"], m["address"], m["phone"], " / ".join(m["genre"]), m["price"],
                        " / ".join(m["opening_hours"]), m["smoking"] or "", yn[m["private_room"]], yn[m["counter"]],
                        m["lat"], m["lng"]]
                       + [src.get(k, {}).get("rating") for k in site_keys]
                       + [src.get(k, {}).get("rating_count") for k in site_keys]
                       + [src.get(k, {}).get("url") for k in site_keys])
    multi = sum(1 for m in merged if len(m["sources"]) > 1)
    log.info("%d件 → %d店（うち複数ソースで一致 %d店）: %s", len(shops), len(merged), multi, out / "restaurants.csv")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="mapmeshi_scraper", description="飲食店情報を複数サイトから収集する")
    ap.add_argument("--out", default="data", help="出力フォルダ（既定: data）")
    sub = ap.add_subparsers(dest="cmd", required=True)

    o = sub.add_parser("osm", help="OpenStreetMap から都道府県単位で飲食店を取得する（キー不要）")
    o.add_argument("pref", nargs="+", help="都道府県名（例: 東京都 大阪府）。「全国」で47都道府県すべて")
    o.set_defaults(func=cmd_osm)

    h = sub.add_parser("hotpepper", help="ホットペッパー グルメサーチ API から都道府県単位で取得する")
    h.add_argument("pref", nargs="+", help="都道府県名（例: 東京都）。「全国」で47都道府県すべて")
    h.add_argument("--key", help="API キー（環境変数 HOTPEPPER_API_KEY でも可）")
    h.add_argument("--max", type=int, help="都道府県ごとの最大件数（お試し用）")
    h.set_defaults(func=cmd_hotpepper)

    c = sub.add_parser("crawl", help="検索結果ページ（または店舗ページ）から店舗情報を集める")
    c.add_argument("urls", nargs="+")
    c.add_argument("--max-pages", type=int, default=3, help="一覧をたどる最大ページ数（既定: 3）")
    c.add_argument("--delay", type=float, default=5.0, help="同じサイトへのアクセス間隔の秒数（最小3、既定: 5）")
    c.add_argument("--cache", default=".cache", help="HTML キャッシュの保存先")
    c.add_argument("--no-cache", action="store_true", help="キャッシュを使わず取り直す")
    c.add_argument("--user-agent", default=DEFAULT_UA)
    c.set_defaults(func=crawl)

    m = sub.add_parser("merge", help="集めたデータの同一店舗をまとめて CSV/JSON に出力する")
    m.set_defaults(func=do_merge)

    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
    return args.func(args)
