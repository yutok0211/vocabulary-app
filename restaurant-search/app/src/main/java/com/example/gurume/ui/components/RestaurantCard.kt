package com.example.gurume.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.gurume.domain.Restaurant
import com.example.gurume.ui.theme.Bronze
import com.example.gurume.ui.theme.Gold
import com.example.gurume.ui.theme.OpenGreen
import com.example.gurume.ui.theme.Orange
import com.example.gurume.ui.theme.Silver

@Composable
fun RestaurantCard(
    rank: Int?,
    restaurant: Restaurant,
    distanceMeters: Double?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (rank != null) {
                    RankBadge(rank)
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    restaurant.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                listOfNotNull(restaurant.area, restaurant.genre).joinToString(" / "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.padding(top = 8.dp))
            Row {
                Thumbnail(restaurant.photos.firstOrNull()?.url)
                Spacer(Modifier.width(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    ScoreRow(restaurant)
                    restaurant.adjustedScore?.let {
                        Text(
                            "補正スコア %.2f".format(it),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    restaurant.priceLabel?.let {
                        Text("予算 $it", style = MaterialTheme.typography.bodySmall)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        when (restaurant.openNow) {
                            true -> Text("営業中", color = OpenGreen, style = MaterialTheme.typography.labelMedium)
                            false -> Text(
                                "営業時間外",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.labelMedium,
                            )
                            null -> {}
                        }
                        if (restaurant.reservable == true) {
                            Text("予約可", style = MaterialTheme.typography.labelMedium)
                        }
                        distanceMeters?.let {
                            Text(formatDistance(it), style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScoreRow(restaurant: Restaurant) {
    val rating = restaurant.rating
    Row(verticalAlignment = Alignment.CenterVertically) {
        if (rating == null) {
            Text("評価なし", style = MaterialTheme.typography.bodyMedium)
            return@Row
        }
        RatingStars(rating)
        Spacer(Modifier.width(4.dp))
        Text(
            "%.1f".format(rating),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Orange,
        )
        Spacer(Modifier.width(6.dp))
        Text(
            "(${formatCount(restaurant.reviewCount)}件)",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun RankBadge(rank: Int) {
    val color = when (rank) {
        1 -> Gold
        2 -> Silver
        3 -> Bronze
        else -> Color.Gray
    }
    Box(
        Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(color)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text("${rank}位", color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Thumbnail(url: String?) {
    val shape = RoundedCornerShape(6.dp)
    if (url == null) {
        Box(
            Modifier.size(96.dp).clip(shape).background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Restaurant, contentDescription = null)
        }
    } else {
        AsyncImage(
            model = url,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(96.dp).clip(shape),
        )
    }
}
