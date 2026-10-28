package com.example.gurume.location

import android.annotation.SuppressLint
import android.content.Context
import com.example.gurume.domain.GeoPoint
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.tasks.await

class LocationProvider(context: Context) {
    private val client = LocationServices.getFusedLocationProviderClient(context)

    /** 呼び出し側で位置情報の権限を取得済みであること。 */
    @SuppressLint("MissingPermission")
    suspend fun current(): GeoPoint? {
        val cts = CancellationTokenSource()
        val location = client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cts.token).await()
            ?: client.lastLocation.await()
        return location?.let { GeoPoint(it.latitude, it.longitude) }
    }
}
