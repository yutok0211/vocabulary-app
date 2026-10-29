"""HTML から店舗一覧のリンクと店舗情報を取り出す。"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .sites import Site, normalize_shop_url

RESTAURANT_TYPES = {
    "Restaurant", "FoodEstablishment", "CafeOrCoffeeShop", "BarOrPub", "Bakery",
    "FastFoodRestaurant", "IceCreamShop", "Brewery", "Winery", "LocalBusiness",
}


@dataclass
class Shop:
    site: str
    url: str
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    phone: str | None = None
    genre: list[str] = field(default_factory=list)
    price: str | None = None
    rating: float | None = None
    rating_count: int | None = None
    opening_hours: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def shop_links(html: str, page_url: str, site: Site) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    seen: dict[str, None] = {}
    for a in soup.find_all("a", href=True):
        url = normalize_shop_url(urljoin(page_url, a["href"]), site)
        if url:
            seen.setdefault(url, None)
    return list(seen)


def next_page(html: str, page_url: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select('link[rel~="next"], a[rel~="next"]'):
        if tag.get("href"):
            return urljoin(page_url, tag["href"])
    for a in soup.find_all("a", href=True):
        if a.get_text(strip=True) in ("次へ", "次の20件", "次のページ", "次の一覧", ">", "»"):
            return urljoin(page_url, a["href"])
    return None


def _jsonld_objects(soup: BeautifulSoup):
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or s.get_text() or "")
        except (json.JSONDecodeError, TypeError):
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            obj = stack.pop(0)
            if isinstance(obj, list):
                stack.extend(obj)
            elif isinstance(obj, dict):
                if "@graph" in obj:
                    stack.extend(obj["@graph"] if isinstance(obj["@graph"], list) else [obj["@graph"]])
                yield obj


def _types(obj: dict) -> set[str]:
    t = obj.get("@type", [])
    return set(t if isinstance(t, list) else [t])


def _num(v) -> float | None:
    if v is None:
        return None
    m = re.search(r"\d+(?:\.\d+)?", str(v).replace(",", ""))
    return float(m.group()) if m else None


def _address(v) -> str | None:
    if isinstance(v, str):
        return v.strip() or None
    if isinstance(v, dict):
        parts = [v.get(k) for k in ("addressRegion", "addressLocality", "streetAddress")]
        joined = "".join(p for p in parts if isinstance(p, str))
        return joined or None
    return None


def _as_list(v) -> list[str]:
    if v is None:
        return []
    items = v if isinstance(v, list) else re.split(r"[、,/・]", str(v))
    return [str(x).strip() for x in items if str(x).strip()]


def _first_text(soup: BeautifulSoup, selectors) -> str | None:
    for sel in selectors:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            return el.get_text(strip=True)
    return None


def parse_shop(html: str, url: str, site: Site) -> Shop | None:
    soup = BeautifulSoup(html, "html.parser")
    obj = next((o for o in _jsonld_objects(soup) if _types(o) & RESTAURANT_TYPES and o.get("name")), None)

    if obj is None:
        og = soup.find("meta", property="og:title")
        name = (og.get("content") if og else None) or (soup.title.get_text(strip=True) if soup.title else None)
        if not name:
            return None
        shop = Shop(site=site.key, url=url, name=name.strip())
    else:
        geo = obj.get("geo") or {}
        agg = obj.get("aggregateRating") or {}
        shop = Shop(
            site=site.key,
            url=url,
            name=str(obj["name"]).strip(),
            address=_address(obj.get("address")),
            lat=_num(geo.get("latitude")),
            lng=_num(geo.get("longitude")),
            phone=obj.get("telephone"),
            genre=_as_list(obj.get("servesCuisine")),
            price=obj.get("priceRange"),
            rating=_num(agg.get("ratingValue")),
            rating_count=int(_num(agg.get("ratingCount") or agg.get("reviewCount")) or 0) or None,
            opening_hours=_as_list(obj.get("openingHours")) if isinstance(obj.get("openingHours"), list) else
            ([obj["openingHours"]] if isinstance(obj.get("openingHours"), str) else []),
        )

    if shop.rating is None:
        shop.rating = _num(_first_text(soup, site.rating_selectors))
    if shop.rating_count is None:
        c = _num(_first_text(soup, site.count_selectors))
        shop.rating_count = int(c) if c else None
    return shop
