package com.example.gurume.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.gurume.data.RestaurantRepository
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
) : ViewModel() {

    private val _state = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = DetailUiState.Loading
        viewModelScope.launch {
            _state.value = runCatching { repository.detail(placeId) }
                .fold(
                    onSuccess = { DetailUiState.Loaded(it) },
                    onFailure = { DetailUiState.Error(it.message ?: "読み込みに失敗しました") },
                )
        }
    }
}
