package app.linka.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("linka", MODE_PRIVATE)
        val sharedText = if (intent?.action == Intent.ACTION_SEND) intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty() else ""
        setContent {
            var text by remember { mutableStateOf(sharedText) }
            var entries by remember {
                mutableStateOf(runCatching {
                    val a = JSONArray(prefs.getString("entries", "[]"))
                    (0 until a.length()).map { a.getJSONObject(it).optString("text") }
                }.getOrDefault(emptyList()))
            }
            MaterialTheme(colorScheme = darkColorScheme()) {
                Surface(Modifier.fillMaxSize()) {
                    Column(Modifier.fillMaxSize().padding(20.dp)) {
                        Text("Linka", style = MaterialTheme.typography.headlineLarge)
                        Text("Your personal inbox", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(20.dp))
                        OutlinedTextField(text, { text = it }, Modifier.fillMaxWidth(), label = { Text("Save a note or link") }, minLines = 3)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = {
                            if (text.isNotBlank()) {
                                entries = listOf(text.trim()) + entries
                                val a = JSONArray()
                                entries.forEach { a.put(JSONObject().put("text", it)) }
                                prefs.edit().putString("entries", a.toString()).apply()
                                text = ""
                            }
                        }, modifier = Modifier.fillMaxWidth()) { Text("Save to Linka") }
                        Spacer(Modifier.height(18.dp))
                        Text("RECENT", style = MaterialTheme.typography.labelLarge)
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(entries) { item ->
                                Card(Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Text(item)
                                        TextButton(onClick = {
                                            val updated = entries.filterNot { it == item }
                                            entries = updated
                                            val a = JSONArray()
                                            updated.forEach { a.put(JSONObject().put("text", it)) }
                                            prefs.edit().putString("entries", a.toString()).apply()
                                        }) { Text("Delete") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}