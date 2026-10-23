package app.linka.android

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.NoteAlt
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONArray
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date
import java.util.UUID

private val Background = Color(0xFF090909)
private val SurfaceDark = Color(0xFF141414)
private val Border = Color(0xFF2A2A2A)
private val MainText = Color(0xFFF5F5F5)
private val Muted = Color(0xFF929292)
private const val PREFS = "linka_local_v2"
private const val CAPTURES_KEY = "captures"
private const val MAX_CAPTURE_CHARS = 100_000
private const val MAX_CAPTURES = 500

private data class Capture(
    val id: String,
    val text: String,
    val createdAt: Long,
    val updatedAt: Long = createdAt,
    val pinned: Boolean = false
)

class MainActivity : ComponentActivity() {
    private var incomingSharedText by mutableStateOf("")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        incomingSharedText = extractSharedText(intent)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = Background) {
                    LinkaHome(
                        initialSharedText = incomingSharedText,
                        loadCaptures = { loadCaptures() },
                        persistCaptures = { persistCaptures(it) },
                        copyText = { copyText(it) },
                        openLink = { openLink(it) }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        incomingSharedText = extractSharedText(intent)
    }

    private fun extractSharedText(intent: Intent?): String {
        if (intent == null) return ""
        return when (intent.action) {
            Intent.ACTION_SEND -> intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString().orEmpty().take(MAX_CAPTURE_CHARS)
            Intent.ACTION_PROCESS_TEXT -> intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString().orEmpty().take(MAX_CAPTURE_CHARS)
            else -> ""
        }
    }

    private fun loadCaptures(): List<Capture> {
        val raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(CAPTURES_KEY, "[]") ?: "[]"
        return try {
            val json = JSONArray(raw)
            (0 until json.length()).mapNotNull { index ->
                val obj = json.optJSONObject(index) ?: return@mapNotNull null
                val id = obj.optString("id", "")
                val text = obj.optString("text", "").trim()
                val createdAt = obj.optLong("createdAt", obj.optLong("savedAt", 0L))
                val updatedAt = obj.optLong("updatedAt", createdAt)
                if (id.isBlank() || text.isBlank() || createdAt <= 0L) null
                else Capture(id, text.take(MAX_CAPTURE_CHARS), createdAt, updatedAt, obj.optBoolean("pinned", false))
            }.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt }).take(MAX_CAPTURES)
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun persistCaptures(captures: List<Capture>) {
        val json = JSONArray()
        captures.take(MAX_CAPTURES).forEach { capture ->
            json.put(
                JSONObject()
                    .put("id", capture.id)
                    .put("text", capture.text.take(MAX_CAPTURE_CHARS))
                    .put("createdAt", capture.createdAt)
                    .put("updatedAt", capture.updatedAt)
                    .put("pinned", capture.pinned)
            )
        }
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(CAPTURES_KEY, json.toString()).apply()
    }

    private fun copyText(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("Linka capture", text))
    }

    private fun openLink(text: String) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(text.trim()))) }
    }
}

@Composable
private fun LinkaHome(
    initialSharedText: String,
    loadCaptures: () -> List<Capture>,
    persistCaptures: (List<Capture>) -> Unit,
    copyText: (String) -> Unit,
    openLink: (String) -> Unit
) {
    var draft by remember { mutableStateOf(initialSharedText) }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") }
    var editingId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf("") }
    var captures by remember { mutableStateOf(loadCaptures()) }
    val context = LocalContext.current

    LaunchedEffect(initialSharedText) {
        if (initialSharedText.isNotBlank()) {
            draft = initialSharedText
            message = "Shared text is ready to save"
        }
    }

    val shown = captures
        .filter { capture ->
            val isLink = capture.text.startsWith("https://", true) || capture.text.startsWith("http://", true)
            val matchesType = when (filter) {
                "pinned" -> capture.pinned
                "links" -> isLink
                "notes" -> !isLink
                else -> true
            }
            matchesType && (query.isBlank() || capture.text.contains(query.trim(), ignoreCase = true))
        }
        .sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt })

    fun commit(updated: List<Capture>) {
        captures = updated.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt })
        persistCaptures(captures)
    }

    Column(
        modifier = Modifier.fillMaxSize().background(Background).verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 22.dp),
        verticalArrangement = Arrangement.spacedBy(15.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("↗", color = MainText, fontSize = 28.sp)
            Text("linka", color = MainText, fontSize = 22.sp)
            Spacer(Modifier.weight(1f))
            Text("ON-DEVICE", color = Muted, fontSize = 10.sp, letterSpacing = 1.6.sp)
        }

        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("Everything, within reach.", color = MainText, fontSize = 27.sp, lineHeight = 33.sp)
            Text("A private inbox for links, thoughts and text.", color = Muted, fontSize = 13.sp)
        }

        Card(colors = CardDefaults.cardColors(containerColor = SurfaceDark), shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                Text(if (editingId == null) "Quick capture" else "Edit capture", color = MainText, fontSize = 14.sp)
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it.take(MAX_CAPTURE_CHARS) },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Paste a link or write a thought", color = Muted, fontSize = 13.sp) },
                    textStyle = TextStyle(color = MainText, fontSize = 13.sp),
                    minLines = 3,
                    maxLines = 6,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Background,
                        unfocusedContainerColor = Background,
                        focusedBorderColor = Border,
                        unfocusedBorderColor = Border,
                        focusedTextColor = MainText,
                        unfocusedTextColor = MainText,
                        cursorColor = MainText
                    )
                )
                Button(
                    onClick = {
                        val clean = draft.trim().take(MAX_CAPTURE_CHARS)
                        if (clean.isNotBlank()) {
                            val wasEditing = editingId != null
                            val now = System.currentTimeMillis()
                            val updated = if (editingId != null) {
                                captures.map { capture ->
                                    if (capture.id == editingId) capture.copy(text = clean, updatedAt = now) else capture
                                }
                            } else {
                                listOf(Capture(UUID.randomUUID().toString(), clean, now, now)) + captures
                            }
                            commit(updated.take(MAX_CAPTURES))
                            draft = ""
                            editingId = null
                            message = if (wasEditing) "Capture updated" else "Saved on this phone"
                        }
                    },
                    enabled = draft.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = MainText, contentColor = Background),
                    modifier = Modifier.fillMaxWidth()
                ) { Text(if (editingId == null) "Save capture ↗" else "Save changes ↗") }

                if (editingId != null) {
                    TextButton(onClick = { draft = ""; editingId = null; message = "Editing cancelled" }) {
                        Text("Cancel edit", color = Muted)
                    }
                }
                if (message.isNotBlank()) Text(message, color = Muted, fontSize = 11.sp)
            }
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = Muted) },
            placeholder = { Text("Search your inbox", color = Muted, fontSize = 13.sp) },
            textStyle = TextStyle(color = MainText, fontSize = 13.sp),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = SurfaceDark,
                unfocusedContainerColor = SurfaceDark,
                focusedBorderColor = Border,
                unfocusedBorderColor = Border,
                focusedTextColor = MainText,
                unfocusedTextColor = MainText,
                cursorColor = MainText
            )
        )

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            listOf("all" to "All", "pinned" to "Pinned", "links" to "Links", "notes" to "Notes").forEach { (key, label) ->
                FilterChip(selected = filter == key, onClick = { filter = key }, label = { Text(label, fontSize = 11.sp) })
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Your inbox", color = MainText, fontSize = 16.sp)
            Spacer(Modifier.weight(1f))
            Text("${shown.size} shown", color = Muted, fontSize = 11.sp)
            if (captures.isNotEmpty()) {
                TextButton(onClick = {
                    val export = JSONArray()
                    captures.forEach { c ->
                        export.put(JSONObject().put("id", c.id).put("text", c.text).put("createdAt", c.createdAt)
                            .put("updatedAt", c.updatedAt).put("pinned", c.pinned))
                    }
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "application/json"
                        putExtra(Intent.EXTRA_SUBJECT, "Linka inbox export")
                        putExtra(Intent.EXTRA_TEXT, export.toString(2))
                    }
                    context.startActivity(Intent.createChooser(send, "Export Linka inbox"))
                }) { Text("Export", color = Muted, fontSize = 11.sp) }
            }
        }

        if (shown.isEmpty()) {
            Text(
                if (captures.isEmpty()) "Nothing saved yet. Share a link from another app or save a thought above."
                else "No captures match this filter.",
                color = Muted,
                fontSize = 13.sp,
                lineHeight = 20.sp,
                modifier = Modifier.padding(vertical = 12.dp)
            )
        } else {
            shown.forEach { capture ->
                val isLink = capture.text.startsWith("https://", true) || capture.text.startsWith("http://", true)
                Card(
                    colors = CardDefaults.cardColors(containerColor = if (capture.pinned) Color(0xFF1B1B1B) else SurfaceDark),
                    shape = RoundedCornerShape(15.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(if (isLink) Icons.Outlined.Link else Icons.Outlined.NoteAlt, contentDescription = null, tint = Muted)
                            Text(if (capture.pinned) "PINNED" else if (isLink) "LINK" else "NOTE", color = Muted, fontSize = 10.sp, letterSpacing = 1.2.sp)
                            Spacer(Modifier.weight(1f))
                            IconButton(onClick = {
                                commit(captures.map { if (it.id == capture.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it })
                            }) { Icon(Icons.Outlined.PushPin, contentDescription = "Pin or unpin", tint = if (capture.pinned) MainText else Muted) }
                        }
                        Text(capture.text, color = MainText, fontSize = 13.sp, lineHeight = 19.sp, maxLines = 8, overflow = TextOverflow.Ellipsis)
                        Text(DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(capture.updatedAt)), color = Muted, fontSize = 10.sp)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                            IconButton(onClick = { copyText(capture.text); message = "Copied to clipboard" }) {
                                Icon(Icons.Outlined.ContentCopy, contentDescription = "Copy", tint = Muted)
                            }
                            if (isLink) TextButton(onClick = { openLink(capture.text) }) { Text("Open link", color = Muted, fontSize = 11.sp) }
                            IconButton(onClick = { draft = capture.text; editingId = capture.id; message = "Edit this capture above" }) {
                                Icon(Icons.Outlined.Edit, contentDescription = "Edit", tint = Muted)
                            }
                            IconButton(onClick = {
                                commit(captures.filterNot { it.id == capture.id })
                                if (editingId == capture.id) { draft = ""; editingId = null }
                                message = "Capture deleted"
                            }) { Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete", tint = Muted) }
                        }
                    }
                }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = SurfaceDark), shape = RoundedCornerShape(13.dp)) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Private by default", color = MainText, fontSize = 12.sp)
                Text("Captures stay on this phone. Export them through the Android share sheet to make a backup or move text elsewhere.", color = Muted, fontSize = 11.sp, lineHeight = 17.sp)
            }
        }
        Text("Linka 0.2.0 · local-first preview", color = Muted, fontSize = 10.sp)
    }
}