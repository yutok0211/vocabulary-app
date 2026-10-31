package com.example.gurume.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.gurume.data.ApiKeyStore
import com.example.gurume.data.RestaurantRepository
import com.example.gurume.data.dataset.Dataset
import com.example.gurume.data.dataset.DatasetShop
import com.example.gurume.data.dataset.DatasetStore
import com.example.gurume.domain.GoogleStatus
import com.example.gurume.domain.RestaurantDetail
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface DetailUiState {
    data object Loading : DetailUiState
    data class Error(val message: String) : DetailUiState
    data class Loaded(val detail: RestaurantDetail) : DetailUiState
}

class DetailViewModel(
    private val placeId: String,
    private val repository: RestaurantRepository,
    private val datasets: DatasetStore,
    private val apiKeys: ApiKeyStore,
) : ViewModel() {

    private val _state = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = DetailUiState.Loading
        viewModelScope.launch {
            _state.value = runCatching {
                if (placeId.startsWith(Dataset.ID_PREFIX)) datasetDetail() else repository.detail(placeId)
            }.fold(
                onSuccess = { DetailUiState.Loaded(it) },
                onFailure = { DetailUiState.Error(it.message ?: "読み込みに失敗しました") },
            )
        }
    }

    /** 集めたデータの店。API キーがあれば Google の店と照合して評価・口コミ・写真を重ねる。 */
    private suspend fun datasetDetail(): RestaurantDetail {
        datasets.restore()
        val shop = datasets.find(placeId) ?: error("このお店のデータが見つかりません。データを読み込み直してください。")
        val base = shop.toDetail(GoogleStatus.NO_KEY)
        if (!apiKeys.hasKey) return base
        return try {
            val g = repository.matchGoogle(shop.restaurant.name, shop.address, shop.restaurant.location)
                ?: return base.copy(googleStatus = GoogleStatus.NOT_FOUND)
            // 店名・住所・設備は集めたデータを優先し、評価・口コミ・写真を Google から重ねる
            val gs = g.summary
            base.copy(
                summary = shop.restaurant.copy(
                    rating = gs.rating,
                    reviewCount = gs.reviewCount,
                    photos = gs.photos,
                    openNow = gs.openNow,
                    reservable = gs.reservable,
                ),
                description = g.description,
                weekdayHours = base.weekdayHours.ifEmpty { g.weekdayHours },
                phone = base.phone ?: g.phone,
                website = g.website,
                googleMapsUri = g.googleMapsUri,
                reviews = g.reviews,
                servesLunch = g.servesLunch,
                servesDinner = g.servesDinner,
                takeout = g.takeout,
                goodForGroups = g.goodForGroups,
                placeId = g.placeId,
                googleStatus = GoogleStatus.OK,
            )
        } catch (e: Exception) {
            base.copy(googleStatus = GoogleStatus.ERROR, googleError = e.message)
        }
    }

    private fun DatasetShop.toDetail(status: GoogleStatus) = RestaurantDetail(
        summary = restaurant,
        address = address,
        description = null,
        weekdayHours = openingHours,
        phone = phone,
        website = null,
        googleMapsUri = null,
        reviews = emptyList(),
        servesLunch = null,
        servesDinner = null,
        takeout = null,
        goodForGroups = null,
        placeId = null,
        googleStatus = status,
    )
}
