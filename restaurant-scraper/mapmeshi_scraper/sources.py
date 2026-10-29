"""公開 API から飲食店を一括取得する（OpenStreetMap / ホットペッパー）。"""
from __future__ import annotations

import logging
import time
from typing import Iterator

import requests

from .fetch import DEFAULT_UA, Blocked
from .parse import Shop
from .prefectures import iso_code, resolve

log = logging.getLogger(__name__)

# ---- OpenStreetMap (Overpass API) ----
# データは ODbL。利用時は「© OpenStreetMap contributors」の表示が必要。

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OSM_AMENITIES = ("restaurant", "cafe", "fast_food", "bar", "pub", "food_court", "ice_cream", "izakaya")

OSM_CUISINE_JA = {
    "ramen": "ラーメン", "sushi": "寿司", "japanese": "和食", "yakiniku": "焼肉", "yakitori": "焼き鳥",
    "udon": "うどん", "soba": "そば", "noodle": "麺類", "tempura": "天ぷら", "tonkatsu": "とんかつ",
    "curry": "カレー", "japanese_curry": "カレー", "okonomiyaki": "お好み焼き", "takoyaki": "たこ焼き",
    "gyudon": "牛丼", "donburi": "丼もの", "kaiseki": "懐石", "izakaya": "居酒屋", "unagi": "うなぎ",
    "chinese": "中華", "korean": "韓国料理", "italian": "イタリアン", "french": "フレンチ", "pizza": "ピザ",
    "burger": "ハンバーガー", "steak_house": "ステーキ", "indian": "インド料理", "thai": "タイ料理",
    "vietnamese": "ベトナム料理", "coffee_shop": "カフェ", "cake": "ケーキ", "seafood": "海鮮",
    "chicken": "鶏料理", "fried_chicken": "唐揚げ", "western": "洋食", "bakery": "パン",
}
OSM_AMENITY_JA = {"cafe": "カフェ", "bar": "バー", "pub": "パブ", "fast_food": "ファストフード",
                  "ice_cream": "アイスクリーム", "izakaya": "居酒屋", "food_court": "フードコート"}


def osm_query(pref: str) -> str:
    amenities = "|".join(OSM_AMENITIES)
    return (
        f'[out:json][timeout:600];area["ISO3166-2"="{iso_code(pref)}"]->.a;'
        f'(nwr["amenity"~"^({amenities})$"]["name"](area.a););out center tags;'
    )


def osm_element_to_shop(el: dict) -> Shop | None:
    tags = el.get("tags") or {}
    name = tags.get("name:ja") or tags.get("name")
    if not name:
        return None
    lat = el.get("lat", (el.get("center") or {}).get("lat"))
    lng = el.get("lon", (el.get("center") or {}).get("lon"))
    cuisines = [c.strip() for c in tags.get("cuisine", "").split(";") if c.strip()]
    genre = [OSM_CUISINE_JA.get(c, c) for c in cuisines]
    if not genre and tags.get("amenity") in OSM_AMENITY_JA:
        genre = [OSM_AMENITY_JA[tags["amenity"]]]
    addr = "".join(tags.get(k, "") for k in ("addr:province", "addr:city", "addr:quarter", "addr:neighbourhood",
                                              "addr:block_number", "addr:housenumber")) or tags.get("addr:full")
    return Shop(
        site="osm",
        url=f"https://www.openstreetmap.org/{el['type']}/{el['id']}",
        name=name,
        address=addr or None,
        lat=lat,
        lng=lng,
        phone=tags.get("phone") or tags.get("contact:phone"),
        genre=genre,
        opening_hours=[tags["opening_hours"]] if tags.get("opening_hours") else [],
    )


def fetch_osm(pref: str, session: requests.Session | None = None, url: str = OVERPASS_URL) -> Iterator[Shop]:
    session = session or _session()
    log.info("OpenStreetMap: %s の飲食店を取得中（数分かかることがあります）", resolve(pref))
    res = session.post(url, data={"data": osm_query(pref)}, timeout=900)
    if res.status_code in (429, 504):
        raise Blocked(f"Overpass API が混雑しています（{res.status_code}）。数分おいて再実行してください。")
    res.raise_for_status()
    for el in res.json().get("elements", []):
        shop = osm_element_to_shop(el)
        if shop:
            yield shop


# ---- ホットペッパー グルメサーチ API ----
# 利用時は「Powered by ホットペッパー Webサービス」のクレジット表示が必要。

HOTPEPPER_BASE = "https://webservice.recruit.co.jp/hotpepper"
HOTPEPPER_PAGE = 100  # 1 リクエストの最大件数


def hotpepper_shop_to_shop(s: dict) -> Shop:
    genres = [g.get("name") for g in (s.get("genre"), s.get("sub_genre")) if isinstance(g, dict) and g.get("name")]
    budget = s.get("budget") or {}
    hours = s.get("open")
    return Shop(
        site="hotpepper",
        url=((s.get("urls") or {}).get("pc") or f"https://www.hotpepper.jp/str{s['id']}/").split("?")[0],
        name=s.get("name", "").strip(),
        address=s.get("address") or None,
        lat=_float(s.get("lat")),
        lng=_float(s.get("lng")),
        genre=genres,
        price=budget.get("average") or budget.get("name") or None,
        opening_hours=[hours] if hours else [],
    )


def hotpepper_large_area_code(key: str, pref: str, session: requests.Session) -> str:
    res = session.get(f"{HOTPEPPER_BASE}/large_area/v1/", params={"key": key, "format": "json"}, timeout=30)
    res.raise_for_status()
    areas = res.json()["results"].get("large_area", [])
    target = resolve(pref)
    for a in areas:
        if a.get("name") in (target, target.rstrip("都府県")):
            return a["code"]
    raise ValueError(f"ホットペッパーの大エリアに {target} が見つかりません")


def fetch_hotpepper(key: str, pref: str, session: requests.Session | None = None,
                    delay: float = 1.0, max_shops: int | None = None) -> Iterator[Shop]:
    session = session or _session()
    code = hotpepper_large_area_code(key, pref, session)
    start, total, got = 1, None, 0
    while total is None or start <= total:
        res = session.get(f"{HOTPEPPER_BASE}/gourmet/v1/", timeout=30, params={
            "key": key, "format": "json", "large_area": code, "count": HOTPEPPER_PAGE, "start": start,
        })
        if res.status_code in (403, 429, 503):
            raise Blocked(f"ホットペッパー API が {res.status_code} を返しました。")
        res.raise_for_status()
        body = res.json()["results"]
        if "error" in body:
            raise RuntimeError(f"ホットペッパー API エラー: {body['error']}")
        total = int(body.get("results_available", 0))
        shops = body.get("shop", [])
        if start == 1:
            log.info("ホットペッパー: %s は %d 件", resolve(pref), total)
        for s in shops:
            yield hotpepper_shop_to_shop(s)
            got += 1
            if max_shops and got >= max_shops:
                return
        if not shops:
            break
        start += len(shops)
        time.sleep(delay)


def _float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": DEFAULT_UA})
    return s
