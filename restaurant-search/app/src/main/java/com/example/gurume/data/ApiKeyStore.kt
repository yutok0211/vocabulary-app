package com.example.gurume.data

import android.content.Context
import com.example.gurume.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** 画面で入力した API キー。未入力ならビルド時に埋め込んだキー（local.properties）を使う。 */
class ApiKeyStore(context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
    private val _key = MutableStateFlow(prefs.getString(KEY, null)?.takeIf { it.isNotBlank() } ?: BuildConfig.PLACES_API_KEY)
    val key: StateFlow<String> = _key.asStateFlow()

    val current: String get() = _key.value
    val hasKey: Boolean get() = _key.value.isNotBlank()

    fun save(value: String) {
        prefs.edit().putString(KEY, value.trim()).apply()
        _key.value = value.trim().ifEmpty { BuildConfig.PLACES_API_KEY }
    }

    private companion object {
        const val KEY = "places_api_key"
    }
}
