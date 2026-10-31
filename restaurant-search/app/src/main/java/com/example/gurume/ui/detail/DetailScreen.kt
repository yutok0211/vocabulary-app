package com.example.gurume.ui.detail

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.example.gurume.data.dataset.Dataset
import com.example.gurume.domain.GoogleStatus
import com.example.gurume.domain.Photo
import com.example.gurume.domain.RestaurantDetail
import com.example.gurume.domain.Review
import com.example.gurume.domain.Scoring
import com.example.gurume.ui.components.GoogleAttribution
import com.example.gurume.ui.components.RatingStars
import com.example.gurume.ui.components.formatCount
import com.example.gurume.ui.theme.Orange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(viewModel: DetailViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val title = (state as? DetailUiState.Loaded)?.detail?.summary?.name.orEmpty()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                DetailUiState.Loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                is DetailUiState.Error -> Column(
                    Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(s.message)
                    TextButton(onClick = viewModel::load) { Text("再読み込み") }
                }
                is DetailUiState.Loaded -> DetailContent(s.detail)
            }
        }
    }
}

@Composable
private fun DetailContent(detail: RestaurantDetail) {
    val context = LocalContext.current
    val open: (String) -> Unit = { uri ->
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) }
    }
    val r = detail.summary

    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {
        item { PhotoPager(r.photos, open) }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(r.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(
                    listOfNotNull(r.area, r.genre).joinToString(" / "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item { ScoreBox(detail) }
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                val mapUri = detail.googleMapsUri
                    ?: r.location?.let { "https://www.google.com/maps/search/?api=1&query=${it.latitude},${it.longitude}" }
                mapUri?.let { ActionButton(Icons.Filled.Map, "地図", Modifier.weight(1f)) { open(it) } }
                r.location?.let { loc ->
                    ActionButton(Icons.Filled.Directions, "ルート", Modifier.weight(1f)) {
                        open(
                            "https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}" +
                                (detail.placeId?.let { "&destination_place_id=$it" } ?: ""),
                        )
                    }
                }
                detail.phone?.let { ActionButton(Icons.Filled.Phone, "電話", Modifier.weight(1f)) { open("tel:$it") } }
                detail.website?.let { ActionButton(Icons.Filled.Language, "HP", Modifier.weight(1f)) { open(it) } }
            }
        }

        item { SectionTitle("店舗情報") }
        item {
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                detail.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                InfoRow("住所", detail.address)
                InfoRow("予算", r.priceLabel)
                InfoRow("電話番号", detail.phone)
                InfoRow("予約", r.reservable?.let { if (it) "予約可" else "予約不可" })
                InfoRow(
                    "利用シーン",
                    listOfNotNull(
                        "ランチ".takeIf { detail.servesLunch == true },
                        "ディナー".takeIf { detail.servesDinner == true },
                        "テイクアウト".takeIf { detail.takeout == true },
                        "団体向け".takeIf { detail.goodForGroups == true },
                    ).joinToString("・").ifEmpty { null },
                )
                InfoRow("禁煙・喫煙", r.smoking?.label)
                InfoRow("個室", r.privateRoom?.let { if (it) "あり" else "なし" })
                InfoRow("カウンター席", r.counter?.let { if (it) "あり" else "なし" })
                if (detail.weekdayHours.isNotEmpty()) {
                    InfoRow("営業時間", detail.weekdayHours.joinToString("\n"))
                }
                InfoRow(
                    "情報元",
                    r.sources.joinToString("\n") { src ->
                        src.label + (src.rating?.let { v -> "（評価 $v" + (src.ratingCount?.let { c -> "・${formatCount(c)}件" } ?: "") + "）" } ?: "")
                    }.ifEmpty { null },
                )
            }
        }

        if (detail.googleStatus == GoogleStatus.OK) {
            item { SectionTitle("口コミ（Google マップ）") }
            if (detail.reviews.isEmpty()) {
                item { Text("口コミはまだありません。", Modifier.padding(horizontal = 16.dp)) }
            }
            items(detail.reviews) { review ->
                ReviewCard(review, onAuthorClick = open)
            }
        }
        detail.googleMapsUri?.let { uri ->
            item {
                OutlinedButton(
                    onClick = { open(uri) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                ) {
                    Text("Google マップで${formatCount(r.reviewCount)}件の口コミをすべて見る")
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun PhotoPager(photos: List<Photo>, open: (String) -> Unit) {
    if (photos.isEmpty()) return
    val pagerState = rememberPagerState { photos.size }
    Box {
        HorizontalPager(pagerState, Modifier.fillMaxWidth().aspectRatio(4f / 3f)) { page ->
            AsyncImage(
                model = photos[page].url,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        }
        val photo = photos[pagerState.currentPage]
        Row(
            Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.45f))
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            // 写真の投稿者表示は Places API の利用規約上の必須項目
            photo.authorName?.let { name ->
                Text(
                    "写真: $name",
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.clickable(enabled = photo.authorUri != null) { photo.authorUri?.let(open) },
                )
            }
            Spacer(Modifier.weight(1f))
            Text("${pagerState.currentPage + 1} / ${photos.size}", color = Color.White, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun ScoreBox(detail: RestaurantDetail) {
    val r = detail.summary
    Card(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Column(Modifier.padding(16.dp)) {
            if (r.rating == null) {
                Text(
                    when (detail.googleStatus) {
                        GoogleStatus.NO_KEY -> "API キーを設定すると、Google マップの★と口コミを表示します。"
                        GoogleStatus.NOT_FOUND -> "Google マップで同じお店が見つかりませんでした。"
                        GoogleStatus.ERROR -> "Google マップの評価を取得できませんでした（${detail.googleError ?: "不明なエラー"}）"
                        GoogleStatus.OK -> "まだ評価がありません"
                    },
                )
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "%.1f".format(r.rating),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = Orange,
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        RatingStars(r.rating, size = 22.dp)
                        Text("口コミ ${formatCount(r.reviewCount)}件", style = MaterialTheme.typography.bodySmall)
                    }
                }
                r.adjustedScore?.let {
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    Text("補正スコア %.2f".format(it), style = MaterialTheme.typography.titleSmall)
                    Text(
                        "口コミ件数を考慮した値（%d件相当の★%.1fを加味）".format(
                            Scoring.PRIOR_WEIGHT.toInt(),
                            Scoring.PRIOR_MEAN,
                        ),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(4.dp))
            if (detail.googleStatus == GoogleStatus.OK) GoogleAttribution()
            if (r.fromDataset) {
                Text(
                    "店舗情報: " + r.sources.joinToString(" / ") { Dataset.SOURCE_CREDIT[it.key] ?: it.label },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ReviewCard(review: Review, onAuthorClick: (String) -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.clickable(enabled = review.authorUri != null) { review.authorUri?.let(onAuthorClick) },
        ) {
            AsyncImage(
                model = review.authorPhotoUri,
                contentDescription = null,
                modifier = Modifier.size(32.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
            )
            Spacer(Modifier.width(8.dp))
            Column {
                Text(review.authorName, style = MaterialTheme.typography.titleSmall)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RatingStars(review.rating.toDouble(), size = 14.dp)
                    review.relativeTime?.let {
                        Spacer(Modifier.width(6.dp))
                        Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Text(
            review.text,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = if (expanded) Int.MAX_VALUE else 4,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp).clickable { expanded = !expanded },
        )
        HorizontalDivider(Modifier.padding(top = 12.dp))
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 8.dp),
    )
}

@Composable
private fun InfoRow(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Row {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(80.dp),
        )
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun ActionButton(icon: ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null)
            Text(label, style = MaterialTheme.typography.labelSmall)
        }
    }
}
