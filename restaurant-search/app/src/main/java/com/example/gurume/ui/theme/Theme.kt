package com.example.gurume.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Orange = Color(0xFFE8730C)
val StarOrange = Color(0xFFF5A623)
val OpenGreen = Color(0xFF2E7D32)
val Gold = Color(0xFFC9A227)
val Silver = Color(0xFF9EA4AA)
val Bronze = Color(0xFFB0703C)

private val LightColors = lightColorScheme(
    primary = Orange,
    onPrimary = Color.White,
    secondary = Color(0xFF6D4C41),
    background = Color(0xFFF7F4F0),
    surface = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFFF9A45),
    onPrimary = Color(0xFF3A1A00),
    secondary = Color(0xFFD7B8AA),
)

@Composable
fun GurumeTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
