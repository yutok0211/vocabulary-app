package com.example.gurume

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory

class GurumeApp : Application(), ImageLoaderFactory {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }

    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .okHttpClient(container.okHttpClient)
            .crossfade(true)
            .build()
}
