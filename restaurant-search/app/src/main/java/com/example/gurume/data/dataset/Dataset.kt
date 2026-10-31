package com.example.gurume.data.dataset

import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.PriceLevel
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.Scoring
import com.example.gurume.domain.Smoking
import com.example.gurume.domain.SourceInfo
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.text.Normalizer

// restaurant-scraper の merge が出力する restaurants.json の 1 店舗
@Serializable
data class MergedRecordDto(
    val name: String? = null,
    val address: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val phone: String? = null,
    val genre: List<String> = emptyList(),
    val price: String? = null,
    @SerialName("opening_hours") val openingHours: List<String> = emptyList(),
    val smoking: String? = null,
    @SerialName("private_room") val privateRoom: Boolean? = null,
    val counter: Boolean? = null,
    val sources: Map<String, SourceDto> = emptyMap(),
)

@Serializable
data class SourceDto(
    val url: String? = null,
    val rating: Double? = null,
    @SerialName("rating_count") val ratingCount: Int? = null,
    val name: String? = null,
)

/** 集めたデータの 1 店舗。一覧用の Restaurant と、詳細画面用の項目を持つ。 */
data class DatasetShop(
    val restaurant: Restaurant,
    val address: String?,
    val phone: String?,
    val openingHours: List<String>,
)

object Dataset {
    const val ID_PREFIX = "d:"
    const val MAX_RESULTS = 300
    const val NEARBY_RADIUS_METERS = 1_500.0

    val SOURCE_LABEL = mapOf(
        "tabelog" to "食べログ", "gnavi" to "ぐるなび", "hotpepper" to "ホットペッパー",
        "retty" to "Retty", "osm" to "OpenStreetMap",
    )
    val SOURCE_CREDIT = mapOf(
        "osm" to "© OpenStreetMap contributors",
        "hotpepper" to "Powered by ホットペッパー Webサービス",
    )

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    /** JSON を読み込む。形式が違えば IllegalArgumentException。 */
    fun parse(text: String): List<DatasetShop> {
        val records = try {
            json.decodeFromString<List<MergedRecordDto>>(text)
        } catch (e: Exception) {
            throw IllegalArgumentException("restaurants.json の形式ではありません", e)
        }
        return records.filter { !it.name.isNullOrBlank() }.mapIndexed(::toShop)
    }

    private fun toShop(index: Int, m: MergedRecordDto): DatasetShop {
        val restaurant = Restaurant(
            id = ID_PREFIX + index,
            name = m.name!!.trim(),
            area = shortArea(m.address),
            genre = m.genre.take(2).joinToString("・").ifEmpty { null },
            location = if (m.lat != null && m.lng != null) GeoPoint(m.lat, m.lng) else null,
            rating = null,
            reviewCount = 0,
            priceLevel = priceLevelFromText(m.price),
            priceFrom = null,
            priceTo = null,
            photos = emptyList(),
            openNow = null,
            reservable = null,
            smoking = Smoking.fromLabel(m.smoking),
            privateRoom = m.privateRoom,
            counter = m.counter,
            priceText = m.price,
            sources = m.sources.map { (key, s) ->
                SourceInfo(key, SOURCE_LABEL[key] ?: key, s.rating, s.ratingCount)
            },
            fromDataset = true,
        )
        return DatasetShop(restaurant, m.address, m.phone, m.openingHours)
    }

    /** 予算表記の最初の金額から Google と同じ 4 段階に振り分ける。 */
    fun priceLevelFromText(text: String?): PriceLevel? {
        val value = Regex("\\d+").find(text.orEmpty().replace(",", "").replace("，", ""))?.value?.toLongOrNull()
            ?: return null
        return when {
            value <= 1_500 -> PriceLevel.INEXPENSIVE
            value <= 4_000 -> PriceLevel.MODERATE
            value <= 10_000 -> PriceLevel.EXPENSIVE
            else -> PriceLevel.VERY_EXPENSIVE
        }
    }

    private fun shortArea(address: String?): String? =
        address?.replace(Regex("^(東京都|北海道|京都府|大阪府|.{2,3}県)"), "")?.take(16)?.ifEmpty { null }

    private fun norm(s: String?): String = Normalizer.normalize(s.orEmpty(), Normalizer.Form.NFKC).lowercase()

    fun search(
        shops: List<DatasetShop>,
        area: String,
        keyword: String,
        origin: GeoPoint?,
        genreAlias: String? = null,
    ): List<Restaurant> {
        var list = shops.map { it.restaurant }
        val addresses = shops.associate { it.restaurant.id to norm(it.address) }
        val a = norm(area).trim().removeSuffix("駅")
        val k = norm(keyword).trim()
        val alias = genreAlias?.let(::norm)

        if (origin != null) {
            list = list
                .filter { r -> r.location?.let { Scoring.distanceMeters(origin, it) <= NEARBY_RADIUS_METERS } == true }
                .sortedBy { r -> Scoring.distanceMeters(origin, r.location!!) }
        } else if (a.isNotEmpty()) {
            list = list.filter { r -> addresses[r.id]!!.contains(a) || norm(r.name).contains(a) }
        }
        if (k.isNotEmpty()) {
            list = list.filter { r ->
                norm(r.name).contains(k) || norm(r.genre).contains(k) || (alias != null && norm(r.genre).contains(alias))
            }
        }
        return list.take(MAX_RESULTS)
    }
}
