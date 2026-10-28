package com.example.gurume.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.gurume.data.RestaurantRepository
import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.SearchFilters
import com.example.gurume.domain.SortOrder
import com.example.gurume.domain.filterAndSort
import com.example.gurume.location.LocationProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SearchUiState(
    val area: String = "",
    val keyword: String = "",
    val nearMe: Boolean = false,
    val filters: SearchFilters = SearchFilters(),
    val sort: SortOrder = SortOrder.RANKING,
    val loading: Boolean = false,
    val error: String? = null,
    val searched: Boolean = false,
    val origin: GeoPoint? = null,
    val results: List<Restaurant> = emptyList(),
) {
    val visibleResults: List<Restaurant> = results.filterAndSort(filters, sort, origin)
    val canSearch: Boolean get() = !loading && (nearMe || area.isNotBlank() || keyword.isNotBlank())
}

class SearchViewModel(
    private val repository: RestaurantRepository,
    private val locationProvider: LocationProvider,
) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    fun onAreaChange(value: String) = _state.update { it.copy(area = value) }
    fun onKeywordChange(value: String) = _state.update { it.copy(keyword = value) }
    fun onNearMeChange(value: Boolean) = _state.update { it.copy(nearMe = value) }

    // 並び替え・絞り込みは取得済みデータに対して行うため API を呼ばない
    fun onSortChange(value: SortOrder) = _state.update { it.copy(sort = value) }
    fun onFiltersChange(value: SearchFilters) = _state.update { it.copy(filters = value) }

    fun onGenreSelected(genre: String) {
        _state.update { it.copy(keyword = genre) }
        if (_state.value.canSearch) search()
    }

    /** nearMe の場合、呼び出し前に UI 側で位置情報の権限を取得しておくこと。 */
    fun search() {
        val s = _state.value
        if (!s.canSearch) return
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            runCatching {
                val origin = if (s.nearMe) {
                    locationProvider.current() ?: error("現在地を取得できませんでした")
                } else {
                    null
                }
                val keyword = s.keyword.ifBlank { "飲食店" }
                val query = if (s.nearMe) keyword else "${s.area} $keyword".trim()
                origin to repository.search(query, origin)
            }.onSuccess { (origin, results) ->
                _state.update {
                    it.copy(
                        loading = false,
                        searched = true,
                        origin = origin,
                        results = results,
                        sort = if (origin == null && it.sort == SortOrder.DISTANCE) SortOrder.RANKING else it.sort,
                    )
                }
            }.onFailure { e ->
                _state.update { it.copy(loading = false, error = e.message ?: "検索に失敗しました") }
            }
        }
    }
}
