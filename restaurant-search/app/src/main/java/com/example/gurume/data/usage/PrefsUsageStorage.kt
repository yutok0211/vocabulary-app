package com.example.gurume.data.usage

import android.content.Context

class PrefsUsageStorage(context: Context) : UsageStorage {
    private val prefs = context.getSharedPreferences("api_usage", Context.MODE_PRIVATE)

    override fun loadMonth(): String? = prefs.getString("month", null)
    override fun loadCount(sku: ApiSku): Int = prefs.getInt("count_${sku.name}", 0)
    override fun loadLimit(sku: ApiSku): Int? =
        if (prefs.contains("limit_${sku.name}")) prefs.getInt("limit_${sku.name}", sku.defaultLimit) else null

    override fun save(month: String, counts: Map<ApiSku, Int>) {
        prefs.edit().apply {
            putString("month", month)
            ApiSku.entries.forEach { putInt("count_${it.name}", counts[it] ?: 0) }
        }.apply()
    }

    override fun saveLimit(sku: ApiSku, limit: Int) {
        prefs.edit().putInt("limit_${sku.name}", limit).apply()
    }
}
