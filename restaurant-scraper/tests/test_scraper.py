"""実サイトの HTML ではなく、構造を模した最小限の HTML でテストする。"""
import json
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from mapmeshi_scraper.fetch import Blocked, Fetcher
from mapmeshi_scraper.merge import merge, normalize_name, normalize_phone
from mapmeshi_scraper.parse import Shop, next_page, parse_shop, shop_links
from mapmeshi_scraper.sites import normalize_shop_url, site_for

TABELOG = site_for("https://tabelog.com/")
GNAVI = site_for("https://r.gnavi.co.jp/")

TABELOG_LIST = """
<html><head><link rel="next" href="/tokyo/A1303/A130301/rstLst/2/"></head><body>
<a href="https://tabelog.com/tokyo/A1303/A130301/13000001/">店A</a>
<a href="https://tabelog.com/tokyo/A1303/A130301/13000001/dtlrvwlst/">口コミ</a>
<a href="/tokyo/A1303/A130301/13000002/?lid=x">店B</a>
<a href="https://tabelog.com/tokyo/A1303/A130301/rstLst/ramen/">ジャンル</a>
</body></html>
"""

TABELOG_SHOP = """
<html><head><script type="application/ld+json">
{"@context":"http://schema.org","@type":"Restaurant","name":"麺処 しろがね",
 "address":{"@type":"PostalAddress","addressRegion":"東京都","addressLocality":"渋谷区","streetAddress":"道玄坂1-2-3"},
 "geo":{"@type":"GeoCoordinates","latitude":35.6575,"longitude":139.6982},
 "telephone":"03-1234-5678","servesCuisine":"ラーメン、つけ麺","priceRange":"￥1,000～￥1,999",
 "aggregateRating":{"@type":"AggregateRating","ratingValue":"3.72","ratingCount":"512"}}
</script></head><body></body></html>
"""

GNAVI_SHOP_NO_RATING = """
<html><head><script type="application/ld+json">
[{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"},
 {"@type":["Restaurant"],"name":"麺処しろがね 渋谷店","telephone":"+81-3-1234-5678",
  "geo":{"latitude":"35.65752","longitude":"139.69825"},"address":"東京都渋谷区道玄坂1-2-3"}]}]
</script></head></html>
"""

FALLBACK_SHOP = """
<html><head><meta property="og:title" content="鮨 はるひ"></head><body>
<b class="c-rating__val">4.05</b><span class="rdheader-rating__review-target"><em>1,234</em></span>
</body></html>
"""


class ParseTest(unittest.TestCase):
    def test_shop_links_dedupes_and_normalizes(self):
        links = shop_links(TABELOG_LIST, "https://tabelog.com/tokyo/A1303/A130301/rstLst/", TABELOG)
        self.assertEqual(links, [
            "https://tabelog.com/tokyo/A1303/A130301/13000001/",
            "https://tabelog.com/tokyo/A1303/A130301/13000002/",
        ])

    def test_next_page(self):
        self.assertEqual(next_page(TABELOG_LIST, "https://tabelog.com/tokyo/A1303/A130301/rstLst/"),
                         "https://tabelog.com/tokyo/A1303/A130301/rstLst/2/")
        self.assertIsNone(next_page("<html></html>", "https://x/"))

    def test_parse_jsonld(self):
        s = parse_shop(TABELOG_SHOP, "https://tabelog.com/tokyo/A1303/A130301/13000001/", TABELOG)
        self.assertEqual(s.name, "麺処 しろがね")
        self.assertEqual(s.address, "東京都渋谷区道玄坂1-2-3")
        self.assertEqual((s.lat, s.lng), (35.6575, 139.6982))
        self.assertEqual(s.genre, ["ラーメン", "つけ麺"])
        self.assertEqual((s.rating, s.rating_count), (3.72, 512))

    def test_parse_graph_without_rating(self):
        s = parse_shop(GNAVI_SHOP_NO_RATING, "https://r.gnavi.co.jp/abc1234/", GNAVI)
        self.assertEqual(s.name, "麺処しろがね 渋谷店")
        self.assertIsNone(s.rating)
        self.assertAlmostEqual(s.lat, 35.65752)

    def test_css_fallback(self):
        s = parse_shop(FALLBACK_SHOP, "https://tabelog.com/tokyo/A1303/A130301/13000003/", TABELOG)
        self.assertEqual((s.name, s.rating, s.rating_count), ("鮨 はるひ", 4.05, 1234))

    def test_normalize_shop_url(self):
        self.assertEqual(normalize_shop_url("https://tabelog.com/tokyo/A1303/A130301/13000001/dtlmenu/?x=1", TABELOG),
                         "https://tabelog.com/tokyo/A1303/A130301/13000001/")
        self.assertIsNone(normalize_shop_url("https://tabelog.com/tokyo/A1303/rstLst/", TABELOG))


class MergeTest(unittest.TestCase):
    def test_normalizers(self):
        self.assertEqual(normalize_phone("+81-3-1234-5678"), "0312345678")
        self.assertEqual(normalize_phone("０３（１２３４）５６７８"), "0312345678")
        self.assertEqual(normalize_name("麺処 しろがね（めんどころ）"), "麺処しろがね")

    def test_merge_by_phone_and_by_name_distance(self):
        a = parse_shop(TABELOG_SHOP, "https://tabelog.com/t/A1303/A130301/13000001/", TABELOG)
        b = parse_shop(GNAVI_SHOP_NO_RATING, "https://r.gnavi.co.jp/abc1234/", GNAVI)
        merged = merge([a, b])
        self.assertEqual(len(merged), 1)
        self.assertEqual(set(merged[0]["sources"]), {"tabelog", "gnavi"})
        self.assertEqual(merged[0]["sources"]["tabelog"]["rating"], 3.72)

        # 電話番号なし → 店名の包含 + 100m 以内で一致
        b.phone = None
        a2 = Shop(**{**a.to_dict(), "phone": None})
        self.assertEqual(len(merge([a2, b])), 1)
        far = Shop(**{**b.to_dict(), "lat": 35.70})
        self.assertEqual(len(merge([a2, far])), 2)

    def test_different_phone_never_merges(self):
        a = Shop(site="tabelog", url="u1", name="鳥貴族 渋谷店", phone="03-1111-1111", lat=35.0, lng=139.0)
        b = Shop(site="gnavi", url="u2", name="鳥貴族 渋谷店", phone="03-2222-2222", lat=35.0, lng=139.0)
        self.assertEqual(len(merge([a, b])), 2)


class FetcherTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.hits = []

        class H(BaseHTTPRequestHandler):
            def do_GET(self):
                cls.hits.append((self.path, time.monotonic()))
                if self.path == "/robots.txt":
                    body, code = b"User-agent: *\nDisallow: /private/\n", 200
                elif self.path == "/limited":
                    body, code = b"slow down", 429
                else:
                    body, code = "<html>ok</html>".encode(), 200
                self.send_response(code)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *a):
                pass

        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def test_robots_delay_cache_and_block(self):
        with tempfile.TemporaryDirectory() as d:
            f = Fetcher(Path(d), delay=3.0)
            self.assertIsNone(f.get(self.base + "/private/x"))  # robots.txt で禁止
            self.assertEqual(f.get(self.base + "/a"), "<html>ok</html>")
            self.assertEqual(f.get(self.base + "/b"), "<html>ok</html>")
            pages = [t for p, t in self.hits if p in ("/a", "/b")]
            self.assertGreaterEqual(pages[1] - pages[0], 3.0)  # 間隔を守る
            n = len(self.hits)
            f.get(self.base + "/a")
            self.assertEqual(len(self.hits), n)  # キャッシュから返す
            with self.assertRaises(Blocked):
                f.get(self.base + "/limited")
            with self.assertRaises(Blocked):
                f.get(self.base + "/c")  # 一度拒否されたホストには以後アクセスしない
            self.assertNotIn("/c", [p for p, _ in self.hits])

    def test_unreachable_robots_means_disallow(self):
        with tempfile.TemporaryDirectory() as d:
            f = Fetcher(Path(d))
            self.assertFalse(f.allowed("http://127.0.0.1:9/anything"))  # 接続できない


if __name__ == "__main__":
    unittest.main()
