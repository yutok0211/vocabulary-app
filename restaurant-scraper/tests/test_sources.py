"""API の応答形式を模したデータで、OpenStreetMap / ホットペッパーの取り込みを確認する。"""
import random
import time
import unittest

from mapmeshi_scraper.merge import merge
from mapmeshi_scraper.parse import Shop
from mapmeshi_scraper.prefectures import iso_code, resolve
from mapmeshi_scraper.sources import fetch_hotpepper, fetch_osm, osm_query


class FakeResponse:
    def __init__(self, body, status=200):
        self._body, self.status_code = body, status

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(self.status_code)


class FakeSession:
    def __init__(self, handler):
        self.handler, self.calls = handler, []

    def get(self, url, params=None, timeout=None):
        self.calls.append((url, params))
        return self.handler(url, params)

    def post(self, url, data=None, timeout=None):
        self.calls.append((url, data))
        return self.handler(url, data)


OVERPASS_BODY = {"elements": [
    {"type": "node", "id": 1, "lat": 35.6575, "lon": 139.6982,
     "tags": {"amenity": "restaurant", "name": "麺処 しろがね", "cuisine": "ramen;noodle", "phone": "+81 3-1234-5678",
              "opening_hours": "Mo-Su 11:00-22:00"}},
    {"type": "way", "id": 2, "center": {"lat": 35.6631, "lon": 139.7007},
     "tags": {"amenity": "cafe", "name": "喫茶 ひだまり"}},
    {"type": "node", "id": 3, "lat": 35.0, "lon": 139.0, "tags": {"amenity": "restaurant"}},  # 名前なし
]}


def hotpepper_handler(total):
    def handler(url, params):
        if "large_area" in url:
            return FakeResponse({"results": {"large_area": [{"code": "Z011", "name": "東京"}, {"code": "Z012", "name": "神奈川"}]}})
        start, count = params["start"], params["count"]
        n = max(0, min(count, total - start + 1))
        shops = [{
            "id": f"J{start + i:09d}", "name": f"店{start + i}", "address": "東京都渋谷区",
            "lat": "35.65", "lng": "139.70", "genre": {"name": "居酒屋"}, "sub_genre": {"name": "和食"},
            "budget": {"name": "3001～4000円", "average": "3500円"}, "open": "月～日: 17:00～23:00",
            "urls": {"pc": f"https://www.hotpepper.jp/strJ{start + i:09d}/?vos=x"},
        } for i in range(n)]
        return FakeResponse({"results": {"results_available": total, "results_start": start, "shop": shops}})
    return handler


class PrefectureTest(unittest.TestCase):
    def test_resolve(self):
        self.assertEqual(resolve("東京"), "東京都")
        self.assertEqual(resolve("大阪府"), "大阪府")
        self.assertEqual(iso_code("北海道"), "JP-01")
        self.assertEqual(iso_code("沖縄"), "JP-47")
        with self.assertRaises(ValueError):
            resolve("江戸")


class OsmTest(unittest.TestCase):
    def test_query_targets_prefecture(self):
        q = osm_query("東京都")
        self.assertIn('"ISO3166-2"="JP-13"', q)
        self.assertIn("out center tags", q)

    def test_fetch_osm(self):
        session = FakeSession(lambda url, data: FakeResponse(OVERPASS_BODY))
        shops = list(fetch_osm("東京都", session=session))
        self.assertEqual([s.name for s in shops], ["麺処 しろがね", "喫茶 ひだまり"])
        self.assertEqual(shops[0].genre, ["ラーメン", "麺類"])
        self.assertEqual(shops[0].url, "https://www.openstreetmap.org/node/1")
        self.assertEqual((shops[1].lat, shops[1].lng, shops[1].genre), (35.6631, 139.7007, ["カフェ"]))


class HotpepperTest(unittest.TestCase):
    def test_pages_through_all_results(self):
        session = FakeSession(hotpepper_handler(total=250))
        shops = list(fetch_hotpepper("KEY", "東京", session=session, delay=0))
        self.assertEqual(len(shops), 250)
        gourmet_calls = [p for u, p in session.calls if "gourmet" in u]
        self.assertEqual([p["start"] for p in gourmet_calls], [1, 101, 201])
        self.assertTrue(all(p["large_area"] == "Z011" for p in gourmet_calls))
        s = shops[0]
        self.assertEqual(s.url, "https://www.hotpepper.jp/strJ000000001/")
        self.assertEqual((s.genre, s.price), (["居酒屋", "和食"], "3500円"))

    def test_max_shops(self):
        shops = list(fetch_hotpepper("KEY", "東京都", session=FakeSession(hotpepper_handler(500)), delay=0, max_shops=30))
        self.assertEqual(len(shops), 30)


class MergeScaleTest(unittest.TestCase):
    def test_merges_osm_and_hotpepper_and_scales(self):
        rnd = random.Random(0)
        shops = []
        for i in range(30_000):
            lat, lng = 35.5 + rnd.random() * 0.3, 139.5 + rnd.random() * 0.4
            shops.append(Shop(site="osm", url=f"o{i}", name=f"テスト食堂{i}号店", lat=lat, lng=lng))
            if i % 3 == 0:  # 3 店に 1 店はホットペッパーにもある（少し位置がずれる）
                shops.append(Shop(site="hotpepper", url=f"h{i}", name=f"テスト食堂{i}号店", lat=lat + 0.0003, lng=lng))
        t = time.monotonic()
        merged = merge(shops)
        elapsed = time.monotonic() - t
        self.assertEqual(len(merged), 30_000)
        self.assertEqual(sum(1 for m in merged if len(m["sources"]) == 2), 10_000)
        self.assertLess(elapsed, 20, f"merge took {elapsed:.1f}s")
        print(f"\n  merge: 40,000件 → {len(merged):,}店 / {elapsed:.1f}秒")


if __name__ == "__main__":
    unittest.main()
