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

enum class Smoking(val label: String) {
    NO_SMOKING("禁煙"),
    PARTIAL("分煙"),
    SMOKING("喫煙可");

    companion object {
        fun fromLabel(value: String?): Smoking? = entries.firstOrNull { it.label == value }
    }
}

/** 集めたデータに含まれる情報元（食べログ・ホットペッパー等）ごとの評価。 */
data class SourceInfo(val key: String, val label: String, val rating: Double?, val ratingCount: Int?)

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
    val smoking: Smoking? = null,
    val privateRoom: Boolean? = null,
    val counter: Boolean? = null,
    /** 集めたデータの予算表記（例: "3500円"）。Google の予算より優先して表示する。 */
    val priceText: String? = null,
    val sources: List<SourceInfo> = emptyList(),
    val fromDataset: Boolean = false,
) {
    /** 口コミ件数で補正したランキング用スコア。 */
    val adjustedScore: Double? get() = Scoring.adjusted(rating, reviewCount)

    /** 例: "¥1,000〜¥2,000" / "¥¥"。不明なら null。 */
    val priceLabel: String?
        get() = when {
            priceText != null -> priceText
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

enum class GoogleStatus { OK, NO_KEY, NOT_FOUND, ERROR }

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
    val placeId: String? = null,
    val googleStatus: GoogleStatus = GoogleStatus.OK,
    val googleError: String? = null,
)
