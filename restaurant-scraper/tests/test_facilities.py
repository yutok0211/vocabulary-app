import unittest

from bs4 import BeautifulSoup

from mapmeshi_scraper.facilities import counter_from_text, extract_facilities, normalize_smoking, normalize_yes_no
from mapmeshi_scraper.merge import merge
from mapmeshi_scraper.parse import Shop, parse_shop
from mapmeshi_scraper.sites import site_for
from mapmeshi_scraper.sources import hotpepper_shop_to_shop, osm_element_to_shop


class NormalizeTest(unittest.TestCase):
    def test_smoking(self):
        cases = {
            "全面禁煙": "禁煙", "完全禁煙（店内に喫煙所なし）": "禁煙", "店内禁煙（屋外に喫煙スペースあり）": "禁煙",
            "禁煙席なし": "喫煙可", "全面喫煙可": "喫煙可", "喫煙可": "喫煙可",
            "一部禁煙": "分煙", "分煙": "分煙", "加熱式たばこ専用の喫煙室あり": "分煙", "禁煙席あり": "分煙",
            "禁煙": "禁煙", "": None, "未確認": None,
        }
        for text, expected in cases.items():
            self.assertEqual(normalize_smoking(text), expected, text)

    def test_yes_no(self):
        self.assertTrue(normalize_yes_no("有 （2人可、4人可）"))
        self.assertTrue(normalize_yes_no("あり ：2～4名様用の半個室"))
        self.assertFalse(normalize_yes_no("無"))
        self.assertFalse(normalize_yes_no("なし ：お問い合わせください"))
        self.assertIsNone(normalize_yes_no("お問い合わせください"))

    def test_counter_text(self):
        self.assertTrue(counter_from_text("落ち着いた空間、カウンター席あり、ソファー席あり"))
        self.assertFalse(counter_from_text("カウンター席なし"))
        self.assertIsNone(counter_from_text("ソファー席あり"))


# 店舗ページの「席・設備」表を模した HTML
SHOP_PAGE = """
<html><head><script type="application/ld+json">{"@type":"Restaurant","name":"焼鳥 とりいち"}</script></head><body>
<table>
  <tr><th>個室</th><td>有 （4人可）</td></tr>
  <tr><th>禁煙・喫煙</th><td>全面禁煙 </td></tr>
  <tr><th>空間・設備</th><td>オシャレな空間、カウンター席あり</td></tr>
</table></body></html>
"""

DL_PAGE = """
<html><body><h1>店</h1><dl><dt>禁煙・喫煙</dt><dd>一部禁煙</dd><dt>個室</dt><dd>なし</dd><dt>カウンター</dt><dd>あり</dd></dl></body></html>
"""


class ExtractTest(unittest.TestCase):
    def test_table(self):
        s = parse_shop(SHOP_PAGE, "https://tabelog.com/tokyo/A1303/A130301/13000009/", site_for("https://tabelog.com/"))
        self.assertEqual((s.smoking, s.private_room, s.counter), ("禁煙", True, True))

    def test_definition_list(self):
        f = extract_facilities(BeautifulSoup(DL_PAGE, "html.parser"))
        self.assertEqual(f, {"smoking": "分煙", "private_room": False, "counter": True})


class SourceTest(unittest.TestCase):
    def test_hotpepper_fields(self):
        s = hotpepper_shop_to_shop({
            "id": "J1", "name": "店", "non_smoking": "全面禁煙", "private_room": "あり ：最大10名",
            "other_memo": "カウンター席でお一人様も歓迎",
        })
        self.assertEqual((s.smoking, s.private_room, s.counter), ("禁煙", True, True))
        s2 = hotpepper_shop_to_shop({"id": "J2", "name": "店2", "non_smoking": "禁煙席なし", "private_room": "なし"})
        self.assertEqual((s2.smoking, s2.private_room, s2.counter), ("喫煙可", False, None))

    def test_osm_smoking_tag(self):
        s = osm_element_to_shop({"type": "node", "id": 5, "lat": 35, "lon": 139, "tags": {"name": "店", "smoking": "outside"}})
        self.assertEqual(s.smoking, "禁煙")

    def test_merge_keeps_false_values(self):
        a = Shop(site="osm", url="o", name="とりいち", phone="03-1111-2222", smoking=None, private_room=None)
        b = Shop(site="hotpepper", url="h", name="とりいち", phone="03-1111-2222", smoking="分煙", private_room=False)
        m = merge([a, b])[0]
        self.assertEqual((m["smoking"], m["private_room"], m["counter"]), ("分煙", False, None))


if __name__ == "__main__":
    unittest.main()
