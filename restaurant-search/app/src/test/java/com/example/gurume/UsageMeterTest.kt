package com.example.gurume

import com.example.gurume.data.usage.ApiSku
import com.example.gurume.data.usage.UsageLevel
import com.example.gurume.data.usage.UsageLimitExceeded
import com.example.gurume.data.usage.UsageMeter
import com.example.gurume.data.usage.UsageStorage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate
import java.time.YearMonth

class UsageMeterTest {
    private class MemoryStorage : UsageStorage {
        var month: String? = null
        val counts = mutableMapOf<ApiSku, Int>()
        val limits = mutableMapOf<ApiSku, Int>()
        override fun loadMonth() = month
        override fun loadCount(sku: ApiSku) = counts[sku] ?: 0
        override fun loadLimit(sku: ApiSku) = limits[sku]
        override fun save(month: String, counts: Map<ApiSku, Int>) {
            this.month = month
            this.counts.clear()
            this.counts.putAll(counts)
        }
        override fun saveLimit(sku: ApiSku, limit: Int) {
            limits[sku] = limit
        }
    }

    private var now = YearMonth.of(2026, 10)
    private val storage = MemoryStorage()
    private fun meter() = UsageMeter(storage) { now }

    @Test
    fun classifiesPlacesRequests() {
        assertEquals(ApiSku.SEARCH, ApiSku.classify("/v1/places:searchText"))
        assertEquals(ApiSku.DETAILS, ApiSku.classify("/v1/places/ChIJ123"))
        assertEquals(ApiSku.PHOTOS, ApiSku.classify("/v1/places/ChIJ123/photos/abc/media"))
        assertNull(ApiSku.classify("/maps/api/js"))
    }

    @Test
    fun warnsAt80PercentAndBlocksAtLimit() {
        val m = meter()
        m.setLimit(ApiSku.SEARCH, 10)
        repeat(7) { m.check(ApiSku.SEARCH); m.record(ApiSku.SEARCH) }
        assertEquals(UsageLevel.OK, m.state.value.level(ApiSku.SEARCH))
        m.record(ApiSku.SEARCH)
        assertEquals(UsageLevel.WARNING, m.state.value.level(ApiSku.SEARCH))
        m.record(ApiSku.SEARCH); m.record(ApiSku.SEARCH)
        assertEquals(UsageLevel.EXHAUSTED, m.state.value.worst)
        val e = assertThrows(UsageLimitExceeded::class.java) { m.check(ApiSku.SEARCH) }
        assertEquals(LocalDate.of(2026, 11, 1), e.resetDate)
        assertTrue(e.message!!.contains("11月1日"))
        // ほかの種類は止まらない
        m.check(ApiSku.PHOTOS)
    }

    @Test
    fun resetsWhenMonthChangesAndKeepsLimits() {
        val m = meter()
        m.setLimit(ApiSku.DETAILS, 2)
        m.record(ApiSku.DETAILS); m.record(ApiSku.DETAILS)
        assertThrows(UsageLimitExceeded::class.java) { m.check(ApiSku.DETAILS) }

        now = YearMonth.of(2026, 11)
        m.check(ApiSku.DETAILS) // 月が変わると再び使える
        assertEquals(0, m.state.value.count(ApiSku.DETAILS))
        assertEquals(2, m.state.value.limit(ApiSku.DETAILS))
    }

    @Test
    fun restoresCountsFromStorageOnlyForSameMonth() {
        meter().apply { record(ApiSku.PHOTOS); record(ApiSku.PHOTOS) }
        assertEquals(2, meter().state.value.count(ApiSku.PHOTOS))
        now = YearMonth.of(2026, 12)
        assertEquals(0, meter().state.value.count(ApiSku.PHOTOS))
    }
}
