package com.example.gurume.ui.search

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatasetSheet(
    datasetSize: Int?,
    onPickFile: () -> Unit,
    onClear: () -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.padding(horizontal = 16.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("集めたデータを読み込む", style = MaterialTheme.typography.titleLarge)
            Text(
                "restaurant-scraper の merge で作った restaurants.json を選ぶと、その店舗の中から検索できます。" +
                    "禁煙・個室・カウンター席で絞り込めるのはこのデータです。読み込んだデータはこの端末に保存されます。",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                if (datasetSize == null) "いまは Google マップで検索しています。" else "読み込み済み: %,d店".format(datasetSize),
                style = MaterialTheme.typography.titleSmall,
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = onClear, enabled = datasetSize != null) { Text("読み込みを解除") }
                Button(onClick = onPickFile) { Text("ファイルを選ぶ") }
            }
        }
    }
}

@Composable
fun ApiKeyDialog(initial: String, onSave: (String) -> Unit, onDismiss: () -> Unit) {
    var key by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Google Maps API キー") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Google Cloud Console で「Places API (New)」を有効にしたキーを入力してください。キーはこの端末にだけ保存されます。",
                    style = MaterialTheme.typography.bodySmall,
                )
                OutlinedTextField(value = key, onValueChange = { key = it }, singleLine = true, label = { Text("API キー") })
            }
        },
        confirmButton = { TextButton(onClick = { onSave(key) }) { Text("保存") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("キャンセル") } },
    )
}
