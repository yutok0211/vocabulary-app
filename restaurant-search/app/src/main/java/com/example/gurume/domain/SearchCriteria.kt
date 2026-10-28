package com.example.gurume.domain

enum class SortOrder(val label: String) {
    RANKING("ランキング"),
    RATING("評価が高い順"),
    REVIEW_COUNT("口コミが多い順"),
    DISTANCE("近い順"),
}

/**
 * 絞り込み条件。API の再呼び出しを避けるため、すべて取得済みの結果に対して端末側で適用する。
 */
data class SearchFilters(
    val minRating: Double = 0.0,
    val minReviewCount: Int = 0,
    val priceLevels: Set<PriceLevel> = emptySet(),
    val openNowOnly: Boolean = false,
    val reservableOnly: Boolean = false,
) {
    val activeCount: Int
        get() = listOf(
            minRating > 0.0,
            minReviewCount > 0,
            priceLevels.isNotEmpty(),
            openNowOnly,
            reservableOnly,
        ).count { it }

    fun matches(r: Restaurant): Boolean {
        if (minRating > 0.0 && (r.rating ?: 0.0) < minRating) return false
        if (r.reviewCount < minReviewCount) return false
        if (priceLevels.isNotEmpty() && r.priceLevel !in priceLevels) return false
        if (openNowOnly && r.openNow != true) return false
        if (reservableOnly && r.reservable != true) return false
        return true
    }
}

fun List<Restaurant>.filterAndSort(
    filters: SearchFilters,
    order: SortOrder,
    origin: GeoPoint?,
): List<Restaurant> {
    val filtered = filter(filters::matches)
    return when (order) {
        SortOrder.RANKING -> filtered.sortedWith(
            compareByDescending<Restaurant> { it.adjustedScore ?: -1.0 }.thenByDescending { it.reviewCount },
        )
        SortOrder.RATING -> filtered.sortedWith(
            compareByDescending<Restaurant> { it.rating ?: -1.0 }.thenByDescending { it.reviewCount },
        )
        SortOrder.REVIEW_COUNT -> filtered.sortedByDescending { it.reviewCount }
        SortOrder.DISTANCE -> if (origin == null) {
            filtered
        } else {
            filtered.sortedBy { r -> r.location?.let { Scoring.distanceMeters(origin, it) } ?: Double.MAX_VALUE }
        }
    }
}
