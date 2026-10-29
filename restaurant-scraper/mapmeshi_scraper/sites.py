"""サイトごとの設定。店舗ページの URL パターンと、JSON-LD に無い項目を補う CSS セレクタ。"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlparse


@dataclass(frozen=True)
class Site:
    key: str
    label: str
    hosts: tuple[str, ...]
    shop_url: re.Pattern
    # JSON-LD に評価が無い場合のフォールバック（上から順に試す）
    rating_selectors: tuple[str, ...] = ()
    count_selectors: tuple[str, ...] = ()
    extra: dict = field(default_factory=dict)


SITES = (
    Site(
        key="tabelog",
        label="食べログ",
        hosts=("tabelog.com",),
        shop_url=re.compile(r"^https://tabelog\.com/[a-z]+/A\d{4}/A\d{6}/\d{6,9}/$"),
        rating_selectors=(".rdheader-rating__score-val-dtl", ".c-rating__val"),
        count_selectors=(".rdheader-rating__review-target .num", ".rdheader-rating__review-target em"),
    ),
    Site(
        key="gnavi",
        label="ぐるなび",
        hosts=("r.gnavi.co.jp",),
        shop_url=re.compile(r"^https://r\.gnavi\.co\.jp/[a-z0-9]{5,12}/$"),
    ),
    Site(
        key="hotpepper",
        label="ホットペッパー",
        hosts=("www.hotpepper.jp",),
        shop_url=re.compile(r"^https://www\.hotpepper\.jp/strJ\d+/$"),
    ),
    Site(
        key="retty",
        label="Retty",
        hosts=("retty.me",),
        shop_url=re.compile(r"^https://retty\.me/area/[A-Z0-9]+/[A-Z0-9]+/(?:[A-Z0-9]+/)?\d+/$"),
    ),
)


def site_for(url: str) -> Site | None:
    host = urlparse(url).hostname or ""
    return next((s for s in SITES if host in s.hosts), None)


def normalize_shop_url(url: str, site: Site) -> str | None:
    """クエリ・フラグメント・サブページ（/dtlrvwlst/ 等）を落として店舗トップの URL にそろえる。"""
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return None
    path = p.path if p.path.endswith("/") else p.path + "/"
    base = f"https://{p.hostname}"
    # 店舗トップより深いパスは 1 段ずつ削って一致を探す
    parts = [x for x in path.split("/") if x]
    for n in range(len(parts), 0, -1):
        candidate = base + "/" + "/".join(parts[:n]) + "/"
        if site.shop_url.match(candidate):
            return candidate
    return None
