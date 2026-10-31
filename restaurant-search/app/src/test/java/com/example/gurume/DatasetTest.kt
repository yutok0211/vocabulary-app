package com.example.gurume

import com.example.gurume.data.dataset.Dataset
import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.PriceLevel
import com.example.gurume.domain.SearchFilters
import com.example.gurume.domain.Smoking
import com.example.gurume.domain.SortOrder
import com.example.gurume.domain.filterAndSort
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class DatasetTest {
    // restaurant-scraper の merge が出力する形式
    private val json = """
        [
          {"name": "炭火焼鳥 てっぺん", "address": "東京都渋谷区道玄坂2-1", "lat": 35.6590, "lng": 139.7000,
           "phone": null, "genre": ["居酒屋", "焼き鳥"], "price": "3500円", "opening_hours": ["17:00～23:00"],
           "smoking": "禁煙", "private_room": true, "counter": true,
           "sources": {"osm": {"url": "https://www.openstreetmap.org/node/1", "rating": null, "rating_count": null, "name": "炭火焼鳥 てっぺん"},
                       "hotpepper": {"url": "https://www.hotpepper.jp/strJ1/", "rating": null, "rating_count": null, "name": "炭火焼鳥 てっぺん 渋谷店"}}},
          {"name": "鮨 しおん", "address": "東京都渋谷区桜丘町5", "lat": 35.6560, "lng": 139.7005, "genre": ["寿司"],
           "price": "￥10,000～￥14,999", "smoking": "禁煙", "private_room": false, "counter": true,
           "sources": {"tabelog": {"url": "https://tabelog.com/x/", "rating": 3.72, "rating_count": 410}}},
          {"name": "大衆酒場 よいどれ", "address": "東京都新宿区歌舞伎町1", "lat": 35.6940, "lng": 139.7030,
           "genre": ["居酒屋"], "price": "2500円", "smoking": "喫煙可", "private_room": false, "counter": null, "sources": {}},
          {"name": "", "sources": {}}
        ]
    """.trimIndent()

    @Test
    fun parsesMergedJson() {
        val shops = Dataset.parse(json)
        assertEquals(3, shops.size)
        val r = shops[0].restaurant
        assertEquals("d:0", r.id)
        assertEquals("渋谷区道玄坂2-1", r.area)
        assertEquals("居酒屋・焼き鳥", r.genre)
        assertEquals(Smoking.NO_SMOKING, r.smoking)
        assertEquals(true, r.privateRoom)
        assertEquals("3500円", r.priceLabel)
        assertEquals(PriceLevel.MODERATE, r.priceLevel)
        assertEquals(listOf("osm", "hotpepper"), r.sources.map { it.key })
        assertEquals(3.72, shops[1].restaurant.sources.single().rating!!, 0.0)
        assertNull(shops[2].restaurant.counter)
    }

    @Test
    fun rejectsOtherJson() {
        assertThrows(IllegalArgumentException::class.java) { Dataset.parse("""{"places": []}""") }
    }

    @Test
    fun priceLevelFromText() {
        assertEquals(PriceLevel.INEXPENSIVE, Dataset.priceLevelFromText("～999円"))
        assertEquals(PriceLevel.EXPENSIVE, Dataset.priceLevelFromText("5001～7000円"))
        assertEquals(PriceLevel.VERY_EXPENSIVE, Dataset.priceLevelFromText("￥10,000～￥14,999"))
        assertNull(Dataset.priceLevelFromText(null))
    }

    @Test
    fun searchesByAreaKeywordAndLocation() {
        val shops = Dataset.parse(json)
        assertEquals(listOf("炭火焼鳥 てっぺん", "鮨 しおん"), Dataset.search(shops, "渋谷駅", "", null).map { it.name })
        assertEquals(listOf("炭火焼鳥 てっぺん", "大衆酒場 よいどれ"), Dataset.search(shops, "", "居酒屋", null).map { it.name })
        // 渋谷駅から 1.5km 以内、近い順
        val near = Dataset.search(shops, "", "", GeoPoint(35.6580, 139.7016)).map { it.name }
        assertEquals(listOf("鮨 しおん", "炭火焼鳥 てっぺん"), near)
    }

    @Test
    fun facilityFilters() {
        val all = Dataset.parse(json).map { it.restaurant }
        fun names(f: SearchFilters) = all.filterAndSort(f, SortOrder.RANKING, null).map { it.name }
        assertEquals(listOf("炭火焼鳥 てっぺん", "鮨 しおん"), names(SearchFilters(noSmokingOnly = true)))
        assertEquals(listOf("炭火焼鳥 てっぺん"), names(SearchFilters(privateRoomOnly = true)))
        assertEquals(listOf("炭火焼鳥 てっぺん", "鮨 しおん"), names(SearchFilters(counterOnly = true)))
        assertEquals(listOf("炭火焼鳥 てっぺん"), names(SearchFilters(noSmokingOnly = true, privateRoomOnly = true, counterOnly = true)))
        assertEquals(3, SearchFilters(noSmokingOnly = true, privateRoomOnly = true, counterOnly = true).activeCount)
    }
}
