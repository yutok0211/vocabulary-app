package com.example.gurume.data.remote

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Places API へのリクエストに API キーを付与する。
 * キーを「Android アプリ」で制限している場合、REST 呼び出しでは
 * パッケージ名と署名証明書の SHA-1 をヘッダで送る必要がある。
 */
class ApiKeyInterceptor(
    private val apiKey: () -> String,
    private val packageName: String,
    private val certSha1: String?,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.url.host != "places.googleapis.com") return chain.proceed(request)
        val builder = request.newBuilder()
            .header("X-Goog-Api-Key", apiKey())
            .header("X-Android-Package", packageName)
        certSha1?.let { builder.header("X-Android-Cert", it) }
        return chain.proceed(builder.build())
    }
}
