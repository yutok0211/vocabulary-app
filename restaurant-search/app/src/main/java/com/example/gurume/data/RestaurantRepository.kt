package com.example.gurume.data

import com.example.gurume.data.remote.Circle
import com.example.gurume.data.remote.LatLngDto
import com.example.gurume.data.remote.LocationBias
import com.example.gurume.data.remote.PlaceDto
import com.example.gurume.data.remote.PlaceMapper
import com.example.gurume.data.remote.PlacesApi
import com.example.gurume.data.remote.SearchTextRequest
import com.example.gurume.data.remote.isFoodPlace
import com.example.gurume.data.usage.UsageLimitExceeded
import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.RestaurantDetail
import com.example.gurume.domain.Scoring

class RestaurantRepository(
    private val api: PlacesApi,
    private val mapper: PlaceMapper,
) {
    /**
     * テキスト検索。Places API は 1 ページ最大 20 件・最大 3 ページ（60 件）まで。
     * 1 ページごとに課金されるため、無料枠に収まるよう既定は 1 ページ（20 件）にしている。
     * 評価順の並び替えは API 側でできないため、取得した結果を端末側で並べ替える。
     */
    suspend fun search(textQuery: String, near: GeoPoint?, maxPages: Int = 1): List<Restaurant> {
        val base = SearchTextRequest(
            textQuery = textQuery,
            locationBias = near?.let {
                LocationBias(Circle(LatLngDto(it.latitude, it.longitude), radius = NEARBY_RADIUS_METERS))
            },
        )
        val places = mutableListOf<PlaceDto>()
        var token: String? = null
        for (page in 0 until maxPages) {
            val res = try {
                api.searchText(PlacesApi.SEARCH_FIELD_MASK, base.copy(pageToken = token))
            } catch (e: UsageLimitExceeded) {
                if (page == 0) throw e else break // 途中で上限に達したら取得済みの分だけ返す
            }
            places += res.places
            token = res.nextPageToken ?: break
        }
        return places
            .distinctBy { it.id }
            .filter { it.isFoodPlace() }
            .map(mapper::toRestaurant)
    }

    /**
     * 集めたデータの店を Google マップの店と照合する。店名＋住所で検索し、
     * 位置が 300m 以上離れていれば別の店とみなして null を返す。
     */
    suspend fun matchGoogle(name: String, address: String?, location: GeoPoint?): RestaurantDetail? {
        val request = SearchTextRequest(
            textQuery = listOfNotNull(name, address).joinToString(" "),
            pageSize = 1,
            locationBias = location?.let {
                LocationBias(Circle(LatLngDto(it.latitude, it.longitude), radius = MATCH_RADIUS_METERS))
            },
        )
        val place = api.searchText(PlacesApi.MATCH_FIELD_MASK, request).places.firstOrNull() ?: return null
        val detail = mapper.toDetail(place)
        val found = detail.summary.location
        if (location != null && found != null && Scoring.distanceMeters(location, found) > MAX_MATCH_DISTANCE_METERS) {
            return null
        }
        return detail
    }

    suspend fun detail(placeId: String): RestaurantDetail =
        mapper.toDetail(api.getPlace(placeId, PlacesApi.DETAIL_FIELD_MASK, languageCode = "ja", regionCode = "JP"))

    companion object {
        const val NEARBY_RADIUS_METERS = 1_500.0
        const val MATCH_RADIUS_METERS = 200.0
        const val MAX_MATCH_DISTANCE_METERS = 300.0
    }
}
