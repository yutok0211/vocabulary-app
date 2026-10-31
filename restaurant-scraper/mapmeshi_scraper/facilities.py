"""禁煙・個室・カウンターの表記ゆれをそろえる。"""
from __future__ import annotations

import re
import unicodedata

from bs4 import BeautifulSoup

NO_SMOKING, PARTIAL, SMOKING = "禁煙", "分煙", "喫煙可"


def _nfkc(text) -> str:
    return unicodedata.normalize("NFKC", str(text or "")).strip()


def normalize_smoking(text) -> str | None:
    """「全面禁煙」「一部禁煙」「禁煙席なし」などを 禁煙 / 分煙 / 喫煙可 にまとめる。"""
    t = _nfkc(text)
    if not t:
        return None
    if re.search(r"全面禁煙|完全禁煙|全席禁煙|店内禁煙", t):
        return NO_SMOKING
    if re.search(r"禁煙席(なし|無)|全面喫煙|全席喫煙", t):
        return SMOKING
    if re.search(r"分煙|一部禁煙|一部喫煙|禁煙席(あり|有)|喫煙席(あり|有)|喫煙(専用)?室|時間帯", t):
        return PARTIAL
    if re.search(r"喫煙可|喫煙OK|喫煙できます", t):
        return SMOKING
    if "禁煙" in t:
        return NO_SMOKING
    return None


def normalize_yes_no(text) -> bool | None:
    """「有 （2人可）」「あり：4名様用」「無」「なし」などを真偽値に。"""
    t = _nfkc(text)
    if re.match(r"^(有|あり|有り|○|◯|可|yes)", t, re.IGNORECASE):
        return True
    if re.match(r"^(無|なし|無し|×|不可|no)", t, re.IGNORECASE):
        return False
    return None


def counter_from_text(text) -> bool | None:
    """設備の説明文に「カウンター」があれば True（「カウンター席なし」なら False）。"""
    t = _nfkc(text)
    if "カウンター" not in t:
        return None
    return not re.search(r"カウンター[^、,/\s]{0,3}(なし|無)", t)


def extract_facilities(soup: BeautifulSoup) -> dict:
    """店舗ページの表（th/td, dt/dd）から 禁煙・個室・カウンター を読む。"""
    found: dict = {"smoking": None, "private_room": None, "counter": None}
    pairs = []
    for tr in soup.find_all("tr"):
        th, td = tr.find("th"), tr.find("td")
        if th and td:
            pairs.append((th.get_text(" ", strip=True), td.get_text(" ", strip=True)))
    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            pairs.append((dt.get_text(" ", strip=True), dd.get_text(" ", strip=True)))

    for label, value in pairs:
        label = _nfkc(label)
        if found["smoking"] is None and ("禁煙" in label or "喫煙" in label):
            found["smoking"] = normalize_smoking(value)
        elif found["private_room"] is None and label.startswith("個室"):
            found["private_room"] = normalize_yes_no(value)
        elif found["counter"] is None and "カウンター" in label:
            yn = normalize_yes_no(value)
            found["counter"] = yn if yn is not None else True  # 「カウンター 8席」など
        elif found["counter"] is None and ("設備" in label or "座席" in label or label == "席"):
            found["counter"] = counter_from_text(value)
    return found
