package com.example.gurume.ui.search

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.AssistChip
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.TextButton
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.gurume.data.dataset.Dataset
import com.example.gurume.domain.Scoring
import com.example.gurume.domain.SortOrder
import com.example.gurume.ui.components.GoogleAttribution
import com.example.gurume.ui.components.RestaurantCard

private val GENRES = listOf(
    "ラーメン", "寿司", "焼肉", "居酒屋", "焼き鳥", "そば", "うどん",
    "カレー", "とんかつ", "イタリアン", "フレンチ", "中華", "カフェ", "バー",
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    onRestaurantClick: (String) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val focus = LocalFocusManager.current
    var showFilters by rememberSaveable { mutableStateOf(false) }
    var showDataset by rememberSaveable { mutableStateOf(false) }
    var showApiKey by rememberSaveable { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbar.showSnackbar(it)
            viewModel.messageShown()
        }
    }
    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            showDataset = false
            viewModel.importDataset(uri)
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        viewModel.onNearMeChange(grants.values.any { it })
    }
    val onNearMeToggle: () -> Unit = {
        if (state.nearMe) {
            viewModel.onNearMeChange(false)
        } else {
            val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
            if (granted) {
                viewModel.onNearMeChange(true)
            } else {
                permissionLauncher.launch(
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                )
            }
        }
    }
    val doSearch = {
        focus.clearFocus()
        viewModel.search()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("マップめし", fontWeight = FontWeight.Bold) },
                actions = {
                    TextButton(onClick = { showDataset = true }) {
                        Text("データ", color = MaterialTheme.colorScheme.onPrimary)
                    }
                    TextButton(onClick = { showApiKey = true }) {
                        Text("APIキー", color = MaterialTheme.colorScheme.onPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            item {
                SearchPanel(
                    area = state.area,
                    keyword = state.keyword,
                    nearMe = state.nearMe,
                    canSearch = state.canSearch,
                    onAreaChange = viewModel::onAreaChange,
                    onKeywordChange = viewModel::onKeywordChange,
                    onNearMeToggle = onNearMeToggle,
                    onSearch = doSearch,
                )
            }
            item {
                Row(
                    Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    GENRES.forEach { genre ->
                        FilterChip(
                            selected = state.keyword == genre,
                            onClick = {
                                focus.clearFocus()
                                viewModel.onGenreSelected(genre)
                            },
                            label = { Text(genre) },
                        )
                    }
                }
            }

            when {
                state.datasetMode -> item {
                    Banner("集めたデータ（%,d店）から検索しています。".format(state.datasetSize))
                }
                !state.hasApiKey -> item {
                    Banner("画面右上の「APIキー」で Google Maps の API キーを設定するか、「データ」から集めたデータを読み込んでください。")
                }
            }

            if (state.searched || state.loading) {
                stickyHeader {
                    Column(Modifier.background(MaterialTheme.colorScheme.background)) {
                        val sorts = if (state.datasetMode) {
                            listOfNotNull(SortOrder.RANKING, SortOrder.DISTANCE.takeIf { state.origin != null })
                        } else {
                            SortOrder.entries.filter { it != SortOrder.DISTANCE || state.origin != null }
                        }
                        ScrollableTabRow(
                            selectedTabIndex = sorts.indexOf(state.sort).coerceAtLeast(0),
                            edgePadding = 12.dp,
                        ) {
                            sorts.forEach { order ->
                                Tab(
                                    selected = state.sort == order,
                                    onClick = { viewModel.onSortChange(order) },
                                    text = { Text(if (state.datasetMode && order == SortOrder.RANKING) "標準" else order.label) },
                                )
                            }
                        }
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "${state.visibleResults.size}件",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.width(8.dp))
                            if (state.datasetMode) {
                                Text(
                                    state.datasetSources.joinToString(" / ") { Dataset.SOURCE_CREDIT[it] ?: Dataset.SOURCE_LABEL[it] ?: it },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    modifier = Modifier.weight(1f, fill = false),
                                )
                            } else {
                                GoogleAttribution()
                            }
                            Spacer(Modifier.weight(1f))
                            BadgedBox(badge = {
                                if (state.filters.activeCount > 0) Badge { Text("${state.filters.activeCount}") }
                            }) {
                                AssistChip(
                                    onClick = { showFilters = true },
                                    label = { Text("絞り込み") },
                                    leadingIcon = { Icon(Icons.Filled.Tune, contentDescription = null) },
                                )
                            }
                        }
                    }
                }
            }

            when {
                state.loading -> item {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                state.error != null -> item { Message(state.error!!) }
                state.searched && state.visibleResults.isEmpty() -> item {
                    Message("条件に合うお店が見つかりませんでした。")
                }
                else -> {
                    if (state.datasetMode && state.results.size >= Dataset.MAX_RESULTS) {
                        item { Message("表示は${Dataset.MAX_RESULTS}件までです。条件を足して絞ってください。") }
                    }
                    if (!state.datasetMode && state.sort == SortOrder.RANKING && state.visibleResults.isNotEmpty()) {
                        item {
                            Text(
                                "ランキングは Google マップの評価を口コミ件数で補正したスコア順です" +
                                    "（口コミが少ない店は★%.1fに近づけて評価）。".format(Scoring.PRIOR_MEAN),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            )
                        }
                    }
                    itemsIndexed(state.visibleResults, key = { _, r -> r.id }) { index, r ->
                        val showRank = !state.datasetMode && (state.sort == SortOrder.RANKING || state.sort == SortOrder.RATING)
                        RestaurantCard(
                            rank = if (showRank) index + 1 else null,
                            restaurant = r,
                            distanceMeters = state.origin?.let { o -> r.location?.let { Scoring.distanceMeters(o, it) } },
                            onClick = { onRestaurantClick(r.id) },
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        )
                    }
                }
            }
        }
    }

    if (showDataset) {
        DatasetSheet(
            datasetSize = state.datasetSize,
            onPickFile = { filePicker.launch(arrayOf("application/json", "text/plain", "application/octet-stream")) },
            onClear = {
                showDataset = false
                viewModel.clearDataset()
            },
            onDismiss = { showDataset = false },
        )
    }
    if (showApiKey) {
        ApiKeyDialog(
            initial = viewModel.currentApiKey(),
            onSave = {
                viewModel.saveApiKey(it)
                showApiKey = false
            },
            onDismiss = { showApiKey = false },
        )
    }

    if (showFilters) {
        FilterSheet(
            initial = state.filters,
            datasetMode = state.datasetMode,
            onApply = {
                viewModel.onFiltersChange(it)
                showFilters = false
            },
            onDismiss = { showFilters = false },
        )
    }
}

@Composable
private fun SearchPanel(
    area: String,
    keyword: String,
    nearMe: Boolean,
    canSearch: Boolean,
    onAreaChange: (String) -> Unit,
    onKeywordChange: (String) -> Unit,
    onNearMeToggle: () -> Unit,
    onSearch: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OutlinedTextField(
            value = if (nearMe) "現在地周辺" else area,
            onValueChange = onAreaChange,
            enabled = !nearMe,
            label = { Text("エリア・駅") },
            placeholder = { Text("例：渋谷駅、新宿三丁目") },
            leadingIcon = { Icon(Icons.Filled.Place, contentDescription = null) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = keyword,
            onValueChange = onKeywordChange,
            label = { Text("ジャンル・キーワード・店名") },
            placeholder = { Text("例：焼肉、個室、〇〇亭") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { if (canSearch) onSearch() }),
            modifier = Modifier.fillMaxWidth(),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            FilterChip(
                selected = nearMe,
                onClick = onNearMeToggle,
                label = { Text("現在地から探す") },
                leadingIcon = { Icon(Icons.Filled.LocationOn, contentDescription = null) },
            )
            Spacer(Modifier.weight(1f))
            Button(onClick = onSearch, enabled = canSearch) {
                Icon(Icons.Filled.Search, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("検索")
            }
        }
    }
}

@Composable
private fun Banner(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSecondaryContainer,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.secondaryContainer)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun Message(text: String) {
    Text(
        text,
        modifier = Modifier.fillMaxWidth().padding(24.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
