package com.example.gurume.ui.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.gurume.data.usage.ApiSku
import com.example.gurume.data.usage.UsageLevel
import com.example.gurume.data.usage.UsageSnapshot
import com.example.gurume.ui.components.formatCount
import com.example.gurume.ui.theme.OpenGreen
import com.example.gurume.ui.theme.Orange

fun usageColor(level: UsageLevel): Color = when (level) {
    UsageLevel.OK -> OpenGreen
    UsageLevel.WARNING -> Orange
    UsageLevel.EXHAUSTED -> Color(0xFFC62828)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsageSheet(
    usage: UsageSnapshot,
    onLimitChange: (ApiSku, Int) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Google マップ API の利用状況", style = MaterialTheme.typography.titleLarge)
            Text(
                "${usage.month.monthValue}月分。${usage.resetDate.monthValue}月${usage.resetDate.dayOfMonth}日" +
                    "（日本時間 16〜17時ごろ）に0回に戻ります。上限の80%で警告し、上限に達すると翌月まで" +
                    "Google への問い合わせを止めます（集めたデータでの検索は使えます）。",
                style = MaterialTheme.typography.bodySmall,
            )
            ApiSku.entries.forEach { sku -> UsageRow(sku, usage, onLimitChange) }
            Text(
                "数えているのはこの端末からの利用だけです。上限の初期値は1,000回で、" +
                    "Google の無料枠に合わせて変更してください。ほかの端末やブラウザ版と同じキーを使う場合は、" +
                    "Google Cloud Console の「割り当て」で1日の上限も設定すると確実です。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun UsageRow(sku: ApiSku, usage: UsageSnapshot, onLimitChange: (ApiSku, Int) -> Unit) {
    var editing by remember { mutableStateOf(false) }
    var text by remember(usage.limit(sku)) { mutableStateOf(usage.limit(sku).toString()) }
    val level = usage.level(sku)

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(sku.label, style = MaterialTheme.typography.titleSmall, modifier = Modifier.width(72.dp))
            Text(
                "${formatCount(usage.count(sku))} / ${formatCount(usage.limit(sku))}回",
                fontWeight = FontWeight.Bold,
                color = usageColor(level),
                modifier = Modifier.weight(1f),
            )
            TextButton(onClick = { editing = !editing }) { Text(if (editing) "閉じる" else "上限を変更") }
        }
        LinearProgressIndicator(
            progress = { usage.ratio(sku).coerceIn(0f, 1f) },
            color = usageColor(level),
            modifier = Modifier.fillMaxWidth(),
        )
        if (editing) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { v -> text = v.filter(Char::isDigit).take(7) },
                    label = { Text("月の上限（回）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = {
                    text.toIntOrNull()?.let { onLimitChange(sku, it) }
                    editing = false
                }) { Text("保存") }
            }
        }
    }
}
