"""複数サイトの同一店舗をまとめる。"""
from __future__ import annotations

import math
import re
import unicodedata

from .parse import Shop

MAX_DISTANCE_M = 100


def normalize_phone(p: str | None) -> str | None:
    if not p:
        return None
    digits = re.sub(r"\D", "", unicodedata.normalize("NFKC", p))
    if digits.startswith("81"):
        digits = "0" + digits[2:]
    return digits if len(digits) >= 9 else None


def normalize_name(n: str) -> str:
    n = unicodedata.normalize("NFKC", n).lower()
    n = re.sub(r"[（(【\[].*?[）)】\]]", "", n)  # 括弧内（支店名の読み・旧店名など）
    n = re.sub(r"\s+|[・･'’\-ー〜~!！?？&＆.。,、]", "", n)
    return n


def distance_m(a: Shop, b: Shop) -> float | None:
    if None in (a.lat, a.lng, b.lat, b.lng):
        return None
    r = 6_371_000
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dp, dl = p2 - p1, math.radians(b.lng - a.lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def same_shop(a: Shop, b: Shop) -> bool:
    pa, pb = normalize_phone(a.phone), normalize_phone(b.phone)
    if pa and pb:
        return pa == pb
    na, nb = normalize_name(a.name), normalize_name(b.name)
    if not na or not nb or not (na in nb or nb in na):
        return False
    d = distance_m(a, b)
    return d is not None and d <= MAX_DISTANCE_M


def merge(shops: list[Shop]) -> list[dict]:
    groups: list[list[Shop]] = []
    for s in shops:
        for g in groups:
            if s.site not in {x.site for x in g} and any(same_shop(s, x) for x in g):
                g.append(s)
                break
        else:
            groups.append([s])

    merged = []
    for g in groups:
        def first(attr):
            return next((getattr(x, attr) for x in g if getattr(x, attr)), None)
        merged.append({
            "name": g[0].name,
            "address": first("address"),
            "lat": first("lat"),
            "lng": first("lng"),
            "phone": first("phone"),
            "genre": sorted({c for x in g for c in x.genre}),
            "price": first("price"),
            "sources": {
                x.site: {"url": x.url, "rating": x.rating, "rating_count": x.rating_count, "name": x.name}
                for x in g
            },
        })
    return merged
