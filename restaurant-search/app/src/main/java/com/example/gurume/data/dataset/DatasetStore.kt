package com.example.gurume.data.dataset

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.io.File

/** 読み込んだ restaurants.json をアプリ内に保存し、次回起動時も使えるようにする。 */
class DatasetStore(private val context: Context) {
    private val file = File(context.filesDir, "restaurants.json")
    private val _shops = MutableStateFlow<List<DatasetShop>?>(null)
    val shops: StateFlow<List<DatasetShop>?> = _shops.asStateFlow()

    suspend fun restore() = withContext(Dispatchers.IO) {
        if (_shops.value == null && file.exists()) {
            _shops.value = runCatching { Dataset.parse(file.readText()) }.getOrNull()
        }
    }

    /** 選ばれたファイルを読み込む。形式が違えば保存せずに例外を投げる。 */
    suspend fun import(uri: Uri): Int = withContext(Dispatchers.IO) {
        val text = context.contentResolver.openInputStream(uri)?.use { it.readBytes().decodeToString() }
            ?: throw IllegalArgumentException("ファイルを開けませんでした")
        val shops = Dataset.parse(text)
        require(shops.isNotEmpty()) { "店舗が1件も含まれていません" }
        file.writeText(text)
        _shops.value = shops
        shops.size
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        file.delete()
        _shops.value = null
    }

    fun find(id: String): DatasetShop? = _shops.value?.firstOrNull { it.restaurant.id == id }
}
