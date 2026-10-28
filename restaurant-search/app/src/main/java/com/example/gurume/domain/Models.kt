package com.example.gurume.domain

data class GeoPoint(val latitude: Double, val longitude: Double)

enum class PriceLevel(val apiValue: String, val label: String) {
    INEXPENSIVE("PRICE_LEVEL_INEXPENSIVE", "¥"),
    MODERATE("PRICE_LEVEL_MODERATE", "¥¥"),
    EXPENSIVE("PRICE_LEVEL_EXPENSIVE", "¥¥¥"),
    VERY_EXPENSIVE("PRICE_LEVEL_VERY_EXPENSIVE", "¥¥¥¥");

    companion object {
        fun fromApi(value: String?): PriceLevel? = entries.firstOrNull { it.apiValue == value }
    }
}

data class Photo(val url: String, val authorName: String?, val authorUri: String?)

data class Restaurant(
    val id: String,
    val name: String,
    val area: String?,
    val genre: String?,
    val location: GeoPoint?,
    val rating: Double?,
    val reviewCount: Int,
    val priceLevel: PriceLevel?,
    val priceFrom: Long?,
    val priceTo: Long?,
    val photos: List<Photo>,
    val openNow: Boolean?,
    val reservable: Boolean?,
) {
    /** 口コミ件数で補正したランキング用スコア。 */
    val adjustedScore: Double? get() = Scoring.adjusted(rating, reviewCount)

    /** 例: "¥1,000〜¥2,000" / "¥¥"。不明なら null。 */
    val priceLabel: String?
        get() = when {
            priceFrom != null && priceTo != null -> "${yen(priceFrom)}〜${yen(priceTo)}"
            priceFrom != null -> "${yen(priceFrom)}〜"
            priceTo != null -> "〜${yen(priceTo)}"
            else -> priceLevel?.label
        }

    private fun yen(value: Long) = "¥" + "%,d".format(value)
}

data class Review(
    val authorName: String,
    val authorUri: String?,
    val authorPhotoUri: String?,
    val rating: Int,
    val relativeTime: String?,
    val text: String,
)

data class RestaurantDetail(
    val summary: Restaurant,
    val address: String?,
    val description: String?,
    val weekdayHours: List<String>,
    val phone: String?,
    val website: String?,
    val googleMapsUri: String?,
    val reviews: List<Review>,
    val servesLunch: Boolean?,
    val servesDinner: Boolean?,
    val takeout: Boolean?,
    val goodForGroups: Boolean?,
)
