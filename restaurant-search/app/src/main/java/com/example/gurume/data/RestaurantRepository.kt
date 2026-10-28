package com.example.gurume.data

import com.example.gurume.data.remote.Circle
import com.example.gurume.data.remote.LatLngDto
import com.example.gurume.data.remote.LocationBias
import com.example.gurume.data.remote.PlaceDto
import com.example.gurume.data.remote.PlaceMapper
import com.example.gurume.data.remote.PlacesApi
import com.example.gurume.data.remote.SearchTextRequest
import com.example.gurume.data.remote.isFoodPlace
import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.RestaurantDetail

class RestaurantRepository(
    private val api: PlacesApi,
    private val mapper: PlaceMapper,
) {
    /**
     * テキスト検索。Places API は 1 ページ最大 20 件・最大 3 ページ（60 件）まで。
     * 評価順の並び替えは API 側でできないため、取得した全件を端末側で並べ替える。
     */
    suspend fun search(textQuery: String, near: GeoPoint?, maxPages: Int = 3): List<Restaurant> {
        val base = SearchTextRequest(
            textQuery = textQuery,
            locationBias = near?.let {
                LocationBias(Circle(LatLngDto(it.latitude, it.longitude), radius = NEARBY_RADIUS_METERS))
            },
        )
        val places = mutableListOf<PlaceDto>()
        var token: String? = null
        for (page in 0 until maxPages) {
            val res = api.searchText(PlacesApi.SEARCH_FIELD_MASK, base.copy(pageToken = token))
            places += res.places
            token = res.nextPageToken ?: break
        }
        return places
            .distinctBy { it.id }
            .filter { it.isFoodPlace() }
            .map(mapper::toRestaurant)
    }

    suspend fun detail(placeId: String): RestaurantDetail =
        mapper.toDetail(api.getPlace(placeId, PlacesApi.DETAIL_FIELD_MASK, languageCode = "ja", regionCode = "JP"))

    companion object {
        const val NEARBY_RADIUS_METERS = 1_500.0
    }
}
