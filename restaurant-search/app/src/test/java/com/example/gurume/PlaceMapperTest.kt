package com.example.gurume

import com.example.gurume.data.remote.PlaceMapper
import com.example.gurume.data.remote.SearchTextRequest
import com.example.gurume.data.remote.SearchTextResponse
import com.example.gurume.data.remote.isFoodPlace
import com.example.gurume.domain.PriceLevel
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaceMapperTest {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; explicitNulls = false }
    private val mapper = PlaceMapper { "https://example.com/$it" }

    // Places API (New) searchText のレスポンス形式に合わせたサンプル
    private val sample = """
        {
          "places": [
            {
              "id": "ChIJ123",
              "types": ["ramen_restaurant", "restaurant", "food", "point_of_interest"],
              "displayName": {"text": "らーめん太郎", "languageCode": "ja"},
              "shortFormattedAddress": "渋谷区道玄坂1丁目",
              "location": {"latitude": 35.658, "longitude": 139.70},
              "rating": 4.3,
              "userRatingCount": 1234,
              "priceLevel": "PRICE_LEVEL_INEXPENSIVE",
              "priceRange": {
                "startPrice": {"currencyCode": "JPY", "units": "1000"},
                "endPrice": {"currencyCode": "JPY", "units": "2000"}
              },
              "primaryTypeDisplayName": {"text": "ラーメン屋", "languageCode": "ja"},
              "photos": [{"name": "places/ChIJ123/photos/abc", "widthPx": 800, "heightPx": 600,
                "authorAttributions": [{"displayName": "Taro", "uri": "https://maps.google.com/u/1"}]}],
              "currentOpeningHours": {"openNow": true},
              "unknownField": 1
            },
            {
              "id": "ChIJ999",
              "types": ["tourist_attraction", "point_of_interest"],
              "displayName": {"text": "渋谷スクランブル交差点"}
            }
          ],
          "nextPageToken": "token2"
        }
    """.trimIndent()

    @Test
    fun parsesAndMapsSearchResponse() {
        val res = json.decodeFromString<SearchTextResponse>(sample)
        assertEquals("token2", res.nextPageToken)
        assertTrue(res.places[0].isFoodPlace())
        assertFalse(res.places[1].isFoodPlace())

        val r = mapper.toRestaurant(res.places[0])
        assertEquals("らーめん太郎", r.name)
        assertEquals(4.3, r.rating!!, 0.0)
        assertEquals(1234, r.reviewCount)
        assertEquals(PriceLevel.INEXPENSIVE, r.priceLevel)
        assertEquals("¥1,000〜¥2,000", r.priceLabel)
        assertEquals("https://example.com/places/ChIJ123/photos/abc", r.photos.single().url)
        assertEquals("Taro", r.photos.single().authorName)
        assertEquals(true, r.openNow)
    }

    @Test
    fun requestOmitsNullFields() {
        val body = json.encodeToString(SearchTextRequest(textQuery = "渋谷 ラーメン"))
        assertEquals("""{"textQuery":"渋谷 ラーメン","languageCode":"ja","regionCode":"JP","pageSize":20}""", body)
    }
}
