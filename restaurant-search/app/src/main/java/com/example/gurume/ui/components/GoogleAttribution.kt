package com.example.gurume.ui.components

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/** Google Maps Platform の利用規約上、Places データ表示時に必要な帰属表示。 */
@Composable
fun GoogleAttribution(modifier: Modifier = Modifier) {
    Text(
        "評価・口コミ: Google マップ",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}
