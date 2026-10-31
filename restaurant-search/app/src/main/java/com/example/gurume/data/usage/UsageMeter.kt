package com.example.gurume.data.usage

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.IOException
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

/** Google の課金単位（SKU）を、このアプリの操作の単位にまとめたもの。 */
enum class ApiSku(val label: String, val defaultLimit: Int) {
    SEARCH("検索", 1_000),
    DETAILS("店舗詳細", 1_000),
    PHOTOS("写真", 1_000);

    companion object {
        /** Places API (New) のリクエストパスから種類を判定する。対象外なら null。 */
        fun classify(path: String): ApiSku? = when {
            !path.startsWith("/v1/places") -> null
            path.endsWith("/media") -> PHOTOS
            path == "/v1/places:searchText" -> SEARCH
            path.startsWith("/v1/places/") -> DETAILS
            else -> null
        }
    }
}

enum class UsageLevel { OK, WARNING, EXHAUSTED }

data class UsageSnapshot(
    val month: YearMonth,
    val counts: Map<ApiSku, Int>,
    val limits: Map<ApiSku, Int>,
) {
    fun count(sku: ApiSku): Int = counts[sku] ?: 0
    fun limit(sku: ApiSku): Int = limits[sku] ?: sku.defaultLimit
    fun ratio(sku: ApiSku): Float = if (limit(sku) <= 0) 1f else count(sku).toFloat() / limit(sku)

    fun level(sku: ApiSku): UsageLevel = when {
        ratio(sku) >= 1f -> UsageLevel.EXHAUSTED
        ratio(sku) >= UsageMeter.WARNING_RATIO -> UsageLevel.WARNING
        else -> UsageLevel.OK
    }

    val worst: UsageLevel get() = ApiSku.entries.map(::level).maxBy { it.ordinal }

    /** 次にリセットされる日（太平洋時間の翌月1日）。 */
    val resetDate: LocalDate get() = month.plusMonths(1).atDay(1)
}

/** 上限に達しているため Google API を呼ばなかった。 */
class UsageLimitExceeded(val sku: ApiSku, val resetDate: LocalDate) : IOException(
    "今月の Google マップ API「${sku.label}」の上限に達したため停止しています。" +
        "${resetDate.monthValue}月${resetDate.dayOfMonth}日（日本時間 16〜17時ごろ）に再開します。",
)

interface UsageStorage {
    fun loadMonth(): String?
    fun loadCount(sku: ApiSku): Int
    fun loadLimit(sku: ApiSku): Int?
    fun save(month: String, counts: Map<ApiSku, Int>)
    fun saveLimit(sku: ApiSku, limit: Int)
}

/**
 * Google API の月ごとの利用回数を数え、上限を超える呼び出しを止める。
 * 数えられるのはこの端末からの呼び出しだけなので、Cloud Console の割り当て（上限）と併用する。
 */
class UsageMeter(
    private val storage: UsageStorage,
    private val currentMonth: () -> YearMonth = { YearMonth.now(BILLING_ZONE) },
) {
    private val _state = MutableStateFlow(load())
    val state: StateFlow<UsageSnapshot> = _state.asStateFlow()

    /** 呼び出し前の確認。上限に達していれば UsageLimitExceeded。 */
    @Synchronized
    fun check(sku: ApiSku) {
        val s = rollover()
        if (s.level(sku) == UsageLevel.EXHAUSTED) throw UsageLimitExceeded(sku, s.resetDate)
    }

    /** 課金対象の呼び出しが成功したら 1 回数える。 */
    @Synchronized
    fun record(sku: ApiSku) {
        val s = rollover()
        val counts = s.counts + (sku to s.count(sku) + 1)
        storage.save(s.month.toString(), counts)
        _state.value = s.copy(counts = counts)
    }

    @Synchronized
    fun setLimit(sku: ApiSku, limit: Int) {
        val value = limit.coerceAtLeast(0)
        storage.saveLimit(sku, value)
        _state.value = rollover().let { it.copy(limits = it.limits + (sku to value)) }
    }

    /** 月が変わっていれば回数を 0 に戻す。 */
    @Synchronized
    fun rollover(): UsageSnapshot {
        val s = _state.value
        val now = currentMonth()
        if (s.month == now) return s
        val reset = s.copy(month = now, counts = emptyMap())
        storage.save(now.toString(), emptyMap())
        _state.value = reset
        return reset
    }

    private fun load(): UsageSnapshot {
        val now = currentMonth()
        val sameMonth = storage.loadMonth() == now.toString()
        return UsageSnapshot(
            month = now,
            counts = if (sameMonth) ApiSku.entries.associateWith(storage::loadCount) else emptyMap(),
            limits = ApiSku.entries.associateWith { storage.loadLimit(it) ?: it.defaultLimit },
        )
    }

    companion object {
        const val WARNING_RATIO = 0.8f

        /** Google Cloud の請求月の区切り。 */
        val BILLING_ZONE: ZoneId = ZoneId.of("America/Los_Angeles")
    }
}
