package com.example.gurume.data.remote

import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.Photo
import com.example.gurume.domain.PriceLevel
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.RestaurantDetail
import com.example.gurume.domain.Review
import kotlin.math.roundToInt

/** 飲食店として扱う Place タイプ。テキスト検索に混ざる観光地・商業施設などを除外する。 */
private val FOOD_TYPES = setOf(
    "restaurant", "food", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery",
    "coffee_shop", "pub", "wine_bar", "food_court",
)

fun PlaceDto.isFoodPlace(): Boolean =
    types.any { it in FOOD_TYPES || it.endsWith("_restaurant") }

class PlaceMapper(private val photoUrl: (photoName: String) -> String) {

    fun toRestaurant(dto: PlaceDto): Restaurant = Restaurant(
        id = dto.id,
        name = dto.displayName?.text ?: "(名称不明)",
        area = dto.shortFormattedAddress ?: dto.formattedAddress,
        genre = dto.primaryTypeDisplayName?.text,
        location = dto.location?.let { GeoPoint(it.latitude, it.longitude) },
        rating = dto.rating,
        reviewCount = dto.userRatingCount ?: 0,
        priceLevel = PriceLevel.fromApi(dto.priceLevel),
        priceFrom = dto.priceRange?.startPrice?.units?.toLongOrNull(),
        priceTo = dto.priceRange?.endPrice?.units?.toLongOrNull(),
        photos = dto.photos.map { p ->
            val author = p.authorAttributions.firstOrNull()
            Photo(url = photoUrl(p.name), authorName = author?.displayName, authorUri = author?.uri)
        },
        openNow = dto.currentOpeningHours?.openNow,
        reservable = dto.reservable,
    )

    fun toDetail(dto: PlaceDto): RestaurantDetail = RestaurantDetail(
        summary = toRestaurant(dto),
        address = dto.formattedAddress,
        description = dto.editorialSummary?.text,
        weekdayHours = (dto.regularOpeningHours ?: dto.currentOpeningHours)?.weekdayDescriptions.orEmpty(),
        phone = dto.nationalPhoneNumber,
        website = dto.websiteUri,
        googleMapsUri = dto.googleMapsUri,
        reviews = dto.reviews.mapNotNull { r ->
            val text = r.text?.text ?: r.originalText?.text ?: return@mapNotNull null
            Review(
                authorName = r.authorAttribution?.displayName ?: "Google ユーザー",
                authorUri = r.authorAttribution?.uri,
                authorPhotoUri = r.authorAttribution?.photoUri,
                rating = (r.rating ?: 0.0).roundToInt(),
                relativeTime = r.relativePublishTimeDescription,
                text = text,
            )
        },
        servesLunch = dto.servesLunch,
        servesDinner = dto.servesDinner,
        takeout = dto.takeout,
        goodForGroups = dto.goodForGroups,
        placeId = dto.id,
    )
}
