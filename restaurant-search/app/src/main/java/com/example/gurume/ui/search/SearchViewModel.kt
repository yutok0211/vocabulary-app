package com.example.gurume.ui.search

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.gurume.data.ApiKeyStore
import com.example.gurume.data.RestaurantRepository
import com.example.gurume.data.dataset.Dataset
import com.example.gurume.data.dataset.DatasetShop
import com.example.gurume.data.dataset.DatasetStore
import com.example.gurume.data.usage.ApiSku
import com.example.gurume.data.usage.UsageLevel
import com.example.gurume.data.usage.UsageMeter
import com.example.gurume.data.usage.UsageSnapshot
import com.example.gurume.domain.GeoPoint
import com.example.gurume.domain.Restaurant
import com.example.gurume.domain.SearchFilters
import com.example.gurume.domain.SortOrder
import com.example.gurume.domain.filterAndSort
import com.example.gurume.location.LocationProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** ジャンルチップの言葉と、データ側のジャンル表記の対応。 */
private val GENRE_ALIASES = mapOf("焼肉" to "焼肉", "イタリアン" to "イタリア", "フレンチ" to "フラン", "カフェ" to "カフェ")

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
    val hasApiKey: Boolean = false,
    /** 読み込んだデータの店舗数。null なら Google マップで検索する。 */
    val datasetSize: Int? = null,
    val datasetSources: List<String> = emptyList(),
    val message: String? = null,
    val usage: UsageSnapshot? = null,
) {
    val datasetMode: Boolean get() = datasetSize != null
    val visibleResults: List<Restaurant> = results.filterAndSort(filters, sort, origin)
    /** Google の検索が今月の上限に達している（集めたデータでの検索は引き続き使える）。 */
    val searchBlocked: Boolean get() = !datasetMode && usage?.level(ApiSku.SEARCH) == UsageLevel.EXHAUSTED
    val canSearch: Boolean
        get() = !loading && !searchBlocked && (datasetMode || hasApiKey) &&
            (nearMe || area.isNotBlank() || keyword.isNotBlank())
}

class SearchViewModel(
    private val repository: RestaurantRepository,
    private val locationProvider: LocationProvider,
    private val datasets: DatasetStore,
    private val apiKeys: ApiKeyStore,
    private val usage: UsageMeter,
) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch { datasets.restore() }
        viewModelScope.launch {
            usage.rollover()
            var lastLevel: UsageLevel? = null
            usage.state.collect { snapshot ->
                val level = snapshot.worst
                // 起動後に警告・停止の段階へ進んだときだけ知らせる（一覧上部の表示は常に出る）
                val message = when {
                    lastLevel == null || level.ordinal <= lastLevel!!.ordinal -> null
                    level == UsageLevel.EXHAUSTED -> "Google マップ API の今月の上限に達しました"
                    level == UsageLevel.WARNING -> "Google マップ API の利用が今月の上限の80%を超えました"
                    else -> null
                }
                lastLevel = level
                _state.update { it.copy(usage = snapshot, message = message ?: it.message) }
            }
        }
        viewModelScope.launch {
            combine(datasets.shops, apiKeys.key) { shops, key -> shops to key }.collect { (shops, key) ->
                val datasetChanged = shops?.size != _state.value.datasetSize
                _state.update {
                    val base = it.copy(
                        hasApiKey = key.isNotBlank(),
                        datasetSize = shops?.size,
                        datasetSources = shops.orEmpty().flatMap { s -> s.restaurant.sources.map { src -> src.key } }.distinct(),
                    )
                    if (datasetChanged) base.copy(results = emptyList(), searched = false, origin = null, sort = SortOrder.RANKING) else base
                }
            }
        }
    }

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

    fun saveApiKey(value: String) = apiKeys.save(value)
    fun setUsageLimit(sku: ApiSku, limit: Int) = usage.setLimit(sku, limit)
    fun currentApiKey(): String = apiKeys.current

    fun importDataset(uri: Uri) {
        viewModelScope.launch {
            runCatching { datasets.import(uri) }
                .onSuccess { n -> _state.update { it.copy(message = "%,d店を読み込みました".format(n)) } }
                .onFailure { e -> _state.update { it.copy(message = "読み込めませんでした: ${e.message}") } }
        }
    }

    fun clearDataset() {
        viewModelScope.launch {
            datasets.clear()
            _state.update { it.copy(message = "データの読み込みを解除しました") }
        }
    }

    fun messageShown() = _state.update { it.copy(message = null) }

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
                val shops: List<DatasetShop>? = datasets.shops.value
                val results = if (shops != null) {
                    Dataset.search(shops, s.area, s.keyword, origin, GENRE_ALIASES[s.keyword.trim()])
                } else {
                    val keyword = s.keyword.ifBlank { "飲食店" }
                    val query = if (s.nearMe) keyword else "${s.area} $keyword".trim()
                    repository.search(query, origin)
                }
                origin to results
            }.onSuccess { (origin, results) ->
                _state.update {
                    val sort = when {
                        origin != null && it.datasetMode -> SortOrder.DISTANCE
                        origin == null && it.sort == SortOrder.DISTANCE -> SortOrder.RANKING
                        else -> it.sort
                    }
                    it.copy(loading = false, searched = true, origin = origin, results = results, sort = sort)
                }
            }.onFailure { e ->
                _state.update { it.copy(loading = false, error = e.message ?: "検索に失敗しました") }
            }
        }
    }
}
