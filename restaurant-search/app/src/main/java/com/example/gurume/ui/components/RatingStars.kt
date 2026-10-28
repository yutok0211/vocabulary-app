package com.example.gurume.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarHalf
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.gurume.ui.theme.StarOrange

@Composable
fun RatingStars(rating: Double, modifier: Modifier = Modifier, size: Dp = 16.dp) {
    Row(modifier) {
        for (i in 1..5) {
            val icon = when {
                rating >= i - 0.25 -> Icons.Filled.Star
                rating >= i - 0.75 -> Icons.Filled.StarHalf
                else -> Icons.Filled.StarOutline
            }
            Icon(icon, contentDescription = null, tint = StarOrange, modifier = Modifier.size(size))
        }
    }
}

fun formatCount(count: Int): String = "%,d".format(count)

fun formatDistance(meters: Double): String =
    if (meters < 1000) "${meters.toInt()}m" else "%.1fkm".format(meters / 1000)
