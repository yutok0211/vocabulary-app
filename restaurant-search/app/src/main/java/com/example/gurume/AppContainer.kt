package com.example.gurume

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.example.gurume.data.ApiKeyStore
import com.example.gurume.data.RestaurantRepository
import com.example.gurume.data.dataset.DatasetStore
import com.example.gurume.data.remote.ApiKeyInterceptor
import com.example.gurume.data.remote.PlaceMapper
import com.example.gurume.data.remote.PlacesApi
import com.example.gurume.data.usage.PrefsUsageStorage
import com.example.gurume.data.usage.UsageInterceptor
import com.example.gurume.data.usage.UsageMeter
import com.example.gurume.location.LocationProvider
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.security.MessageDigest

/** 手動 DI コンテナ。 */
class AppContainer(context: Context) {
    val apiKeys = ApiKeyStore(context)

    val datasets = DatasetStore(context)

    val usage = UsageMeter(PrefsUsageStorage(context))

    private val json = Json {
        ignoreUnknownKeys = true
        // languageCode などデフォルト値を持つフィールドも送信し、null のフィールドは省略する
        encodeDefaults = true
        explicitNulls = false
    }

    /** Places API と写真読み込み（Coil）で共用する。 */
    val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(UsageInterceptor(usage))
        .addInterceptor(ApiKeyInterceptor({ apiKeys.current }, context.packageName, signingCertSha1(context)))
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))
            }
        }
        .build()

    private val api: PlacesApi = Retrofit.Builder()
        .baseUrl(PlacesApi.BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(PlacesApi::class.java)

    // 写真 URL にはキーを含めない（ApiKeyInterceptor がヘッダで付与する）
    private val mapper = PlaceMapper { photoName ->
        "${PlacesApi.BASE_URL}v1/$photoName/media?maxWidthPx=800"
    }

    val repository = RestaurantRepository(api, mapper)

    val locationProvider = LocationProvider(context)

    private fun signingCertSha1(context: Context): String? = runCatching {
        val pm = context.packageManager
        val cert = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                .signingInfo?.apkContentsSigners?.firstOrNull()
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES).signatures?.firstOrNull()
        } ?: return null
        MessageDigest.getInstance("SHA-1").digest(cert.toByteArray())
            .joinToString("") { "%02X".format(it) }
    }.getOrNull()
}
