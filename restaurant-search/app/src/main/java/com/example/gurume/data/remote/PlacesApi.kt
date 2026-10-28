package com.example.gurume.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface PlacesApi {
    @POST("v1/places:searchText")
    suspend fun searchText(
        @Header("X-Goog-FieldMask") fieldMask: String,
        @Body request: SearchTextRequest,
    ): SearchTextResponse

    @GET("v1/places/{placeId}")
    suspend fun getPlace(
        @Path("placeId") placeId: String,
        @Header("X-Goog-FieldMask") fieldMask: String,
        @Query("languageCode") languageCode: String,
        @Query("regionCode") regionCode: String,
    ): PlaceDto

    companion object {
        const val BASE_URL = "https://places.googleapis.com/"

        // 取得フィールドで課金 SKU が決まる。rating / userRatingCount は Enterprise、
        // reviews は Enterprise + Atmosphere。一覧では reviews を取らず詳細画面でのみ取得する。
        val SEARCH_FIELD_MASK = listOf(
            "places.id",
            "places.displayName",
            "places.shortFormattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.priceRange",
            "places.primaryTypeDisplayName",
            "places.types",
            "places.photos",
            "places.currentOpeningHours.openNow",
            "places.reservable",
            "nextPageToken",
        ).joinToString(",")

        val DETAIL_FIELD_MASK = listOf(
            "id",
            "displayName",
            "formattedAddress",
            "shortFormattedAddress",
            "location",
            "rating",
            "userRatingCount",
            "priceLevel",
            "priceRange",
            "primaryTypeDisplayName",
            "types",
            "photos",
            "currentOpeningHours",
            "regularOpeningHours",
            "googleMapsUri",
            "nationalPhoneNumber",
            "websiteUri",
            "reviews",
            "editorialSummary",
            "reservable",
            "servesLunch",
            "servesDinner",
            "takeout",
            "goodForGroups",
        ).joinToString(",")
    }
}
