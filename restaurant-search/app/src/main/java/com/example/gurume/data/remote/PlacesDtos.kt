package com.example.gurume.data.remote

import kotlinx.serialization.Serializable

// Google Places API (New) のリクエスト/レスポンス。必要なフィールドのみ定義する。
// https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places

@Serializable
data class SearchTextRequest(
    val textQuery: String,
    val languageCode: String = "ja",
    val regionCode: String = "JP",
    val pageSize: Int = 20,
    val pageToken: String? = null,
    val locationBias: LocationBias? = null,
)

@Serializable
data class LocationBias(val circle: Circle)

@Serializable
data class Circle(val center: LatLngDto, val radius: Double)

@Serializable
data class LatLngDto(val latitude: Double, val longitude: Double)

@Serializable
data class SearchTextResponse(
    val places: List<PlaceDto> = emptyList(),
    val nextPageToken: String? = null,
)

@Serializable
data class LocalizedText(val text: String? = null, val languageCode: String? = null)

@Serializable
data class PlaceDto(
    val id: String,
    val displayName: LocalizedText? = null,
    val formattedAddress: String? = null,
    val shortFormattedAddress: String? = null,
    val location: LatLngDto? = null,
    val rating: Double? = null,
    val userRatingCount: Int? = null,
    val priceLevel: String? = null,
    val priceRange: PriceRangeDto? = null,
    val primaryTypeDisplayName: LocalizedText? = null,
    val types: List<String> = emptyList(),
    val photos: List<PhotoDto> = emptyList(),
    val currentOpeningHours: OpeningHoursDto? = null,
    val regularOpeningHours: OpeningHoursDto? = null,
    val googleMapsUri: String? = null,
    val nationalPhoneNumber: String? = null,
    val websiteUri: String? = null,
    val reviews: List<ReviewDto> = emptyList(),
    val editorialSummary: LocalizedText? = null,
    val reservable: Boolean? = null,
    val servesLunch: Boolean? = null,
    val servesDinner: Boolean? = null,
    val takeout: Boolean? = null,
    val goodForGroups: Boolean? = null,
)

@Serializable
data class PriceRangeDto(val startPrice: MoneyDto? = null, val endPrice: MoneyDto? = null)

// units は int64 のため JSON では文字列で返る
@Serializable
data class MoneyDto(val currencyCode: String? = null, val units: String? = null)

@Serializable
data class OpeningHoursDto(
    val openNow: Boolean? = null,
    val weekdayDescriptions: List<String> = emptyList(),
)

@Serializable
data class PhotoDto(
    val name: String,
    val widthPx: Int? = null,
    val heightPx: Int? = null,
    val authorAttributions: List<AuthorAttributionDto> = emptyList(),
)

@Serializable
data class AuthorAttributionDto(
    val displayName: String? = null,
    val uri: String? = null,
    val photoUri: String? = null,
)

@Serializable
data class ReviewDto(
    val rating: Double? = null,
    val text: LocalizedText? = null,
    val originalText: LocalizedText? = null,
    val relativePublishTimeDescription: String? = null,
    val publishTime: String? = null,
    val authorAttribution: AuthorAttributionDto? = null,
)
