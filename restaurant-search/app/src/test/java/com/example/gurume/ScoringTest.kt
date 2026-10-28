package com.example.gurume

import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.PriceLevel
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.Scoring
import com.example.gurume.domain.SearchFilters
import com.example.gurume.domain.SortOrder
import com.example.gurume.domain.filterAndSort
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ScoringTest {

    private fun restaurant(
        id: String,
        rating: Double?,
        count: Int,
        price: PriceLevel? = null,
        openNow: Boolean? = null,
        location: GeoPoint? = null,
    ) = Restaurant(
        id = id, name = id, area = null, genre = null, location = location,
        rating = rating, reviewCount = count, priceLevel = price, priceFrom = null, priceTo = null,
        photos = emptyList(), openNow = openNow, reservable = null,
    )

    @Test
    fun adjustedScorePullsFewReviewsTowardPrior() {
        val few = Scoring.adjusted(5.0, 3)!!
        val many = Scoring.adjusted(4.4, 2000)!!
        assert(many > few) { "many=$many few=$few" }
        assertEquals(4.39, many, 0.01)
    }

    @Test
    fun adjustedScoreIsNullWithoutReviews() {
        assertNull(Scoring.adjusted(4.0, 0))
        assertNull(Scoring.adjusted(null, 10))
    }

    @Test
    fun rankingOrderDiffersFromRawRatingOrder() {
        val list = listOf(restaurant("new", 5.0, 3), restaurant("popular", 4.4, 2000))
        assertEquals(listOf("popular", "new"), list.filterAndSort(SearchFilters(), SortOrder.RANKING, null).map { it.id })
        assertEquals(listOf("new", "popular"), list.filterAndSort(SearchFilters(), SortOrder.RATING, null).map { it.id })
    }

    @Test
    fun filtersAreApplied() {
        val list = listOf(
            restaurant("a", 4.5, 100, PriceLevel.MODERATE, openNow = true),
            restaurant("b", 3.2, 500, PriceLevel.MODERATE, openNow = true),
            restaurant("c", 4.6, 5, PriceLevel.EXPENSIVE, openNow = false),
        )
        val filters = SearchFilters(minRating = 4.0, minReviewCount = 10, priceLevels = setOf(PriceLevel.MODERATE), openNowOnly = true)
        assertEquals(listOf("a"), list.filterAndSort(filters, SortOrder.RANKING, null).map { it.id })
        assertEquals(4, filters.activeCount)
    }

    @Test
    fun distanceSortUsesOrigin() {
        val shibuya = GeoPoint(35.6580, 139.7016)
        val list = listOf(
            restaurant("far", 4.0, 10, location = GeoPoint(35.6896, 139.7006)), // 新宿
            restaurant("near", 4.0, 10, location = GeoPoint(35.6590, 139.7030)),
            restaurant("unknown", 4.0, 10),
        )
        assertEquals(listOf("near", "far", "unknown"), list.filterAndSort(SearchFilters(), SortOrder.DISTANCE, shibuya).map { it.id })
        val d = Scoring.distanceMeters(shibuya, GeoPoint(35.6896, 139.7006))
        assertEquals(3500.0, d, 150.0)
    }
}
