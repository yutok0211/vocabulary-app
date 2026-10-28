package com.example.gurume.domain

import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

object Scoring {
    /** Google マップの国内飲食店の平均的な評価。口コミが少ない店はこの値に引き寄せる。 */
    const val PRIOR_MEAN = 3.8

    /** 事前分布の重み（仮想的な口コミ件数）。大きいほど口コミ件数を重視する。 */
    const val PRIOR_WEIGHT = 30.0

    /**
     * ベイズ平均による補正スコア。
     * 「★5.0・口コミ3件」の店が「★4.4・口コミ2,000件」の店より上位に来ないようにする。
     */
    fun adjusted(rating: Double?, reviewCount: Int): Double? {
        if (rating == null || reviewCount <= 0) return null
        return (reviewCount * rating + PRIOR_WEIGHT * PRIOR_MEAN) / (reviewCount + PRIOR_WEIGHT)
    }

    /** 2点間の距離（メートル、Haversine）。 */
    fun distanceMeters(a: GeoPoint, b: GeoPoint): Double {
        val r = 6_371_000.0
        val dLat = Math.toRadians(b.latitude - a.latitude)
        val dLng = Math.toRadians(b.longitude - a.longitude)
        val h = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(a.latitude)) * cos(Math.toRadians(b.latitude)) * sin(dLng / 2).pow(2)
        return 2 * r * asin(sqrt(h))
    }
}
