package com.example.gurume.ui.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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

/**
 * @param datasetMode 集めたデータで検索中。Google の評価が無いので評価・口コミ件数の条件を出さない
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterSheet(
    initial: SearchFilters,
    datasetMode: Boolean,
    onApply: (SearchFilters) -> Unit,
    onDismiss: () -> Unit,
) {
    var draft by remember { mutableStateOf(initial) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
        ) {
            Text("絞り込み", style = MaterialTheme.typography.titleLarge)

            if (!datasetMode) {
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
            if (!datasetMode) {
                SwitchRow("営業中のみ", draft.openNowOnly) { draft = draft.copy(openNowOnly = it) }
                SwitchRow("予約可のみ", draft.reservableOnly) { draft = draft.copy(reservableOnly = it) }
            }

            Text("席・設備", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp))
            SwitchRow("禁煙のみ", draft.noSmokingOnly, enabled = datasetMode) { draft = draft.copy(noSmokingOnly = it) }
            SwitchRow("個室あり", draft.privateRoomOnly, enabled = datasetMode) { draft = draft.copy(privateRoomOnly = it) }
            SwitchRow("カウンター席あり", draft.counterOnly, enabled = datasetMode) { draft = draft.copy(counterOnly = it) }
            if (!datasetMode) {
                Text(
                    "Google マップのデータには禁煙・個室・カウンター席の情報がありません。" +
                        "この3つは画面右上の「データ」から読み込んだ店舗で使えます。",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }

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
private fun SwitchRow(label: String, checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Switch(checked = checked && enabled, onCheckedChange = onChange, enabled = enabled)
    }
}
