package com.example.gurume.data.usage

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Places API への通信をすべてここで数える（検索・詳細・写真）。
 * 上限に達していれば通信せずに UsageLimitExceeded を投げる。
 */
class UsageInterceptor(private val meter: UsageMeter) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.url.host != "places.googleapis.com") return chain.proceed(request)
        val sku = ApiSku.classify(request.url.encodedPath) ?: return chain.proceed(request)
        meter.check(sku)
        val response = chain.proceed(request)
        // 失敗したリクエストは課金されないため数えない
        if (response.isSuccessful || response.isRedirect) meter.record(sku)
        return response
    }
}
