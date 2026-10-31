package com.example.gurume

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.gurume.ui.detail.DetailScreen
import com.example.gurume.ui.detail.DetailViewModel
import com.example.gurume.ui.search.SearchScreen
import com.example.gurume.ui.search.SearchViewModel
import com.example.gurume.ui.theme.GurumeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as GurumeApp).container

        setContent {
            GurumeTheme {
                val nav = rememberNavController()
                NavHost(navController = nav, startDestination = "search") {
                    composable("search") {
                        val vm: SearchViewModel = viewModel(
                            factory = viewModelFactory {
                                initializer {
                                    SearchViewModel(container.repository, container.locationProvider, container.datasets, container.apiKeys)
                                }
                            },
                        )
                        SearchScreen(
                            viewModel = vm,
                            onRestaurantClick = { id -> nav.navigate("detail/${Uri.encode(id)}") },
                        )
                    }
                    composable(
                        "detail/{placeId}",
                        arguments = listOf(navArgument("placeId") { type = NavType.StringType }),
                    ) { entry ->
                        val placeId = entry.arguments?.getString("placeId").orEmpty()
                        val vm: DetailViewModel = viewModel(
                            factory = viewModelFactory {
                                initializer { DetailViewModel(placeId, container.repository, container.datasets, container.apiKeys) }
                            },
                        )
                        DetailScreen(viewModel = vm, onBack = { nav.popBackStack() })
                    }
                }
            }
        }
    }
}
