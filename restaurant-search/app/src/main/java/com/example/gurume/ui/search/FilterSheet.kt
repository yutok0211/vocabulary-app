package com.example.gurume.ui.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.gurume.domain.PriceLevel
import com.example.gurume.domain.SearchFilters

private val RATING_OPTIONS = listOf(0.0, 3.5, 4.0, 4.3, 4.5)
private val REVIEW_COUNT_OPTIONS = listOf(0, 10, 50, 100, 500)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FilterSheet(
    initial: SearchFilters,
    onApply: (SearchFilters) -> Unit,
    onDismiss: () -> Unit,
) {
    var draft by remember { mutableStateOf(initial) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
            Text("絞り込み", style = MaterialTheme.typography.titleLarge)

            Section("Google マップの評価") {
                RATING_OPTIONS.forEach { v ->
                    FilterChip(
                        selected = draft.minRating == v,
                        onClick = { draft = draft.copy(minRating = v) },
                        label = { Text(if (v == 0.0) "指定なし" else "★%.1f以上".format(v)) },
                    )
                }
            }
            Section("口コミ件数") {
                REVIEW_COUNT_OPTIONS.forEach { v ->
                    FilterChip(
                        selected = draft.minReviewCount == v,
                        onClick = { draft = draft.copy(minReviewCount = v) },
                        label = { Text(if (v == 0) "指定なし" else "${v}件以上") },
                    )
                }
            }
            Section("予算") {
                PriceLevel.entries.forEach { level ->
                    val selected = level in draft.priceLevels
                    FilterChip(
                        selected = selected,
                        onClick = {
                            draft = draft.copy(
                                priceLevels = if (selected) draft.priceLevels - level else draft.priceLevels + level,
                            )
                        },
                        label = { Text(level.label) },
                    )
                }
            }
            SwitchRow("営業中のみ", draft.openNowOnly) { draft = draft.copy(openNowOnly = it) }
            SwitchRow("予約可のみ", draft.reservableOnly) { draft = draft.copy(reservableOnly = it) }

            Spacer(Modifier.padding(top = 16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = { draft = SearchFilters() }) { Text("条件をクリア") }
                Button(onClick = { onApply(draft) }) { Text("この条件で絞り込む") }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Text(title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp))
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { content() }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label)
        Switch(checked = checked, onCheckedChange = onChange)
    }
}
