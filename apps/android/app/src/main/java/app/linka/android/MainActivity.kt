package app.linka.android

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.NoteAlt
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import org.json.JSONArray
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date
import java.util.UUID

private val DarkBackground = Color(0xFF09090B)
private val DarkSurface = Color(0xFF141417)
private val DarkRaised = Color(0xFF1B1B20)
private val DarkBorder = Color(0xFF303036)
private val DarkText = Color(0xFFF5F5F7)
private val DarkMuted = Color(0xFF96969F)
private val LightBackground = Color(0xFFF4F4F6)
private val LightSurface = Color(0xFFFFFFFF)
private val LightRaised = Color(0xFFF8F8FA)
private val LightBorder = Color(0xFFE2E2E8)
private val LightText = Color(0xFF19191E)
private val LightMuted = Color(0xFF74747E)
private const val PREFS = "linka_local_v3"
private const val CAPTURES_KEY = "captures"
private const val THEME_KEY = "theme"
private const val TERMS_KEY = "agreement_accepted"
private const val TERMS_VERSION = "2026-10-23-v1"
private const val MAX_CAPTURE_CHARS = 100_000
private const val MAX_CAPTURES = 500

private data class Capture(val id: String, val text: String, val createdAt: Long, val updatedAt: Long = createdAt, val pinned: Boolean = false)

class MainActivity : ComponentActivity() {
    private var incomingSharedText by mutableStateOf("")
    private fun preferences() = getSharedPreferences(PREFS, MODE_PRIVATE)
    private fun readTheme() = preferences().getString(THEME_KEY, "dark") ?: "dark"
    private fun saveTheme(value: String) { preferences().edit().putString(THEME_KEY, value).apply() }
    private fun hasAcceptedTerms() = preferences().getString(TERMS_KEY, "") == TERMS_VERSION
    private fun acceptTerms() { preferences().edit().putString(TERMS_KEY, TERMS_VERSION).apply() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        incomingSharedText = extractSharedText(intent)
        setContent {
            var themeMode by remember { mutableStateOf(readTheme()) }
            var accepted by remember { mutableStateOf(hasAcceptedTerms()) }
            val systemDark = androidx.compose.foundation.isSystemInDarkTheme()
            val isDark = themeMode == "dark" || (themeMode == "system" && systemDark)
            MaterialTheme(colorScheme = if (isDark) darkColorScheme(
                background = DarkBackground, surface = DarkSurface, primary = DarkText, onPrimary = DarkBackground,
                onBackground = DarkText, onSurface = DarkText, surfaceVariant = DarkRaised, outline = DarkBorder
            ) else lightColorScheme(
                background = LightBackground, surface = LightSurface, primary = LightText, onPrimary = LightSurface,
                onBackground = LightText, onSurface = LightText, surfaceVariant = LightRaised, outline = LightBorder
            )) {
                Surface(Modifier.fillMaxSize(), color = if (isDark) DarkBackground else LightBackground) {
                    LinkaHome(
                        initialSharedText = incomingSharedText,
                        loadCaptures = { loadCaptures() },
                        persistCaptures = { persistCaptures(it) },
                        copyText = { copyText(it) },
                        openLink = { openLink(it) },
                        themeMode = themeMode,
                        onThemeChanged = { themeMode = it; saveTheme(it) },
                        agreementAccepted = accepted,
                        onAgree = { acceptTerms(); accepted = true },
                        onDecline = { finish() }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent); setIntent(intent); incomingSharedText = extractSharedText(intent)
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
        val raw = preferences().getString(CAPTURES_KEY, "[]") ?: "[]"
        return try {
            val json = JSONArray(raw)
            (0 until json.length()).mapNotNull { i ->
                val obj = json.optJSONObject(i) ?: return@mapNotNull null
                val text = obj.optString("text", "").trim()
                val createdAt = obj.optLong("createdAt", 0L)
                if (text.isBlank() || createdAt <= 0) null else Capture(
                    obj.optString("id", UUID.randomUUID().toString()), text.take(MAX_CAPTURE_CHARS),
                    createdAt, obj.optLong("updatedAt", createdAt), obj.optBoolean("pinned", false)
                )
            }.sortedWith(compareByDescending<Capture>{it.pinned}.thenByDescending{it.updatedAt}).take(MAX_CAPTURES)
        } catch (_: Exception) { emptyList() }
    }
    private fun persistCaptures(captures: List<Capture>) {
        val json = JSONArray()
        captures.take(MAX_CAPTURES).forEach { c ->
            json.put(JSONObject().put("id", c.id).put("text", c.text.take(MAX_CAPTURE_CHARS))
                .put("createdAt", c.createdAt).put("updatedAt", c.updatedAt).put("pinned", c.pinned))
        }
        preferences().edit().putString(CAPTURES_KEY, json.toString()).apply()
    }
    private fun copyText(text: String) {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Linka capture", text))
    }
    private fun openLink(text: String) { runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(text.trim()))) } }
}

@Composable
private fun LinkaHome(
    initialSharedText: String,
    loadCaptures: () -> List<Capture>,
    persistCaptures: (List<Capture>) -> Unit,
    copyText: (String) -> Unit,
    openLink: (String) -> Unit,
    themeMode: String,
    onThemeChanged: (String) -> Unit,
    agreementAccepted: Boolean,
    onAgree: () -> Unit,
    onDecline: () -> Unit
) {
    val isDark = MaterialTheme.colorScheme.background == DarkBackground
    val bg = if (isDark) DarkBackground else LightBackground
    val panel = if (isDark) DarkSurface else LightSurface
    val raised = if (isDark) DarkRaised else LightRaised
    val border = if (isDark) DarkBorder else LightBorder
    val main = if (isDark) DarkText else LightText
    val muted = if (isDark) DarkMuted else LightMuted
    val context = LocalContext.current
    var draft by remember { mutableStateOf(initialSharedText) }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") }
    var editingId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf("") }
    var captures by remember { mutableStateOf(loadCaptures()) }
    var settingsOpen by remember { mutableStateOf(false) }
    var termsOpen by remember { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(initialSharedText) {
        if (initialSharedText.isNotBlank()) { draft = initialSharedText; message = "Shared text is ready to save" }
    }
    val shown = captures.filter { c ->
        val link = c.text.startsWith("http://", true) || c.text.startsWith("https://", true)
        val typeMatches = when (filter) { "pinned" -> c.pinned; "links" -> link; "notes" -> !link; else -> true }
        typeMatches && (query.isBlank() || c.text.contains(query.trim(), ignoreCase = true))
    }.sortedWith(compareByDescending<Capture>{it.pinned}.thenByDescending{it.updatedAt})

    fun commit(updated: List<Capture>) {
        captures = updated.sortedWith(compareByDescending<Capture>{it.pinned}.thenByDescending{it.updatedAt}).take(MAX_CAPTURES)
        persistCaptures(captures)
    }
    Column(
        Modifier.fillMaxSize().background(bg).verticalScroll(rememberScrollState()).padding(horizontal = 18.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(shape = RoundedCornerShape(13.dp), color = panel, border = androidx.compose.foundation.BorderStroke(1.dp, border)) {
                Text("↗", color = main, fontSize = 25.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 11.dp, vertical = 5.dp))
            }
            Column {
                Text("linka", color = main, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.3).sp)
                Text("YOUR PERSONAL INBOX", color = muted, fontSize = 9.sp, letterSpacing = 1.5.sp)
            }
            Spacer(Modifier.weight(1f))
            Text("ON DEVICE", color = muted, fontSize = 9.sp, letterSpacing = 1.sp)
            IconButton(onClick = { settingsOpen = true }) { Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = muted) }
        }
        Column(verticalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.padding(top = 3.dp, bottom = 2.dp)) {
            AnimatedVisibility(visible = true, enter = fadeIn(spring()) + slideInVertically { it / 4 }) {
                Text("Keep what matters.", color = main, fontSize = 29.sp, lineHeight = 34.sp, fontWeight = FontWeight.Medium, letterSpacing = (-1.6).sp)
            }
            Text("Links, thoughts and text. One calm place.", color = muted, fontSize = 12.sp, lineHeight = 18.sp)
        }
        Card(colors = CardDefaults.cardColors(containerColor = panel), shape = RoundedCornerShape(20.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, border), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(if (editingId == null) "Quick capture" else "Edit capture", color = main, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = draft, onValueChange = { draft = it.take(MAX_CAPTURE_CHARS) }, modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Drop a link or save a thought…", color = muted, fontSize = 12.sp) },
                    textStyle = TextStyle(color = main, fontSize = 13.sp, lineHeight = 19.sp),
                    minLines = 3, maxLines = 6, shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = bg, unfocusedContainerColor = bg, focusedBorderColor = border,
                        unfocusedBorderColor = border, focusedTextColor = main, unfocusedTextColor = main,
                        cursorColor = main, focusedPlaceholderColor = muted, unfocusedPlaceholderColor = muted
                    )
                )
                Button(
                    onClick = {
                        val text = draft.trim().take(MAX_CAPTURE_CHARS)
                        if (text.isNotBlank()) {
                            val wasEditing = editingId != null
                            val now = System.currentTimeMillis()
                            val newItems = if (wasEditing) captures.map { if (it.id == editingId) it.copy(text = text, updatedAt = now) else it }
                            else listOf(Capture(UUID.randomUUID().toString(), text, now, now)) + captures
                            commit(newItems)
                            draft = ""; editingId = null; message = if (wasEditing) "Capture updated" else "Saved on this phone"
                        }
                    },
                    enabled = draft.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg),
                    shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().heightButton()
                ) { Text(if (editingId == null) "Save to inbox  ↗" else "Save changes  ↗", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                AnimatedVisibility(visible = editingId != null || message.isNotBlank(), enter = fadeIn() + slideInVertically { it / 3 }, exit = fadeOut() + slideOutVertically { it / 3 }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(if (editingId != null) "Editing a saved capture" else message, color = muted, fontSize = 10.sp, modifier = Modifier.weight(1f))
                        if (editingId != null) TextButton(onClick = { draft = ""; editingId = null; message = "" }) { Text("Cancel", color = muted) }
                    }
                }
            }
        }
        OutlinedTextField(
            value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = muted) },
            placeholder = { Text("Search your inbox…", color = muted, fontSize = 12.sp) },
            textStyle = TextStyle(color = main, fontSize = 12.sp), shape = RoundedCornerShape(13.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = panel, unfocusedContainerColor = panel, focusedBorderColor = border,
                unfocusedBorderColor = border, focusedTextColor = main, unfocusedTextColor = main, cursorColor = main
            )
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("all" to "All", "pinned" to "Pinned", "links" to "Links", "notes" to "Notes").forEach { (key, label) ->
                FilterChip(selected = filter == key, onClick = { filter = key }, label = { Text(label, fontSize = 10.sp) })
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Your inbox", color = main, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.weight(1f))
            Text("${shown.size} items", color = muted, fontSize = 10.sp)
            if (captures.isNotEmpty()) TextButton(onClick = {
                val export = JSONArray()
                captures.forEach { c -> export.put(JSONObject().put("id", c.id).put("text", c.text).put("createdAt", c.createdAt).put("updatedAt", c.updatedAt).put("pinned", c.pinned)) }
                val intent = Intent(Intent.ACTION_SEND).apply { type = "application/json"; putExtra(Intent.EXTRA_SUBJECT, "Linka inbox export"); putExtra(Intent.EXTRA_TEXT, export.toString(2)) }
                context.startActivity(Intent.createChooser(intent, "Export Linka inbox"))
            }) { Text("Export", color = muted, fontSize = 10.sp) }
        }
        if (shown.isEmpty()) {
            Card(colors = CardDefaults.cardColors(containerColor = panel), border = androidx.compose.foundation.BorderStroke(1.dp, border),
                shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text(if (captures.isEmpty()) "Nothing saved yet" else "No matches", color = main, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(if (captures.isEmpty()) "Save a thought above or share text from another app." else "Try another search or filter.", color = muted, fontSize = 11.sp, lineHeight = 17.sp)
                }
            }
        } else {
            shown.forEach { capture ->
                val isLink = capture.text.startsWith("http://", true) || capture.text.startsWith("https://", true)
                Card(colors = CardDefaults.cardColors(containerColor = if (capture.pinned) raised else panel),
                    border = androidx.compose.foundation.BorderStroke(1.dp, border),
                    shape = RoundedCornerShape(17.dp), modifier = Modifier.fillMaxWidth().animateContentSize(spring(dampingRatio = .82f, stiffness = 320f))) {
                    Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                            Icon(if (isLink) Icons.Outlined.Link else Icons.Outlined.NoteAlt, contentDescription = null, tint = muted, modifier = Modifier.size(16.dp))
                            Text(if (capture.pinned) "PINNED" else if (isLink) "LINK" else "NOTE", color = muted, fontSize = 9.sp, letterSpacing = 1.3.sp)
                            Spacer(Modifier.weight(1f))
                            IconButton(onClick = { commit(captures.map { if (it.id == capture.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it }) }, modifier = Modifier.size(31.dp)) {
                                Icon(Icons.Outlined.PushPin, contentDescription = "Pin", tint = if (capture.pinned) main else muted, modifier = Modifier.size(17.dp))
                            }
                        }
                        Text(capture.text, color = main, fontSize = 12.sp, lineHeight = 18.sp, maxLines = 8, overflow = TextOverflow.Ellipsis)
                        Text(DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(capture.updatedAt)), color = muted, fontSize = 9.sp)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                            IconButton(onClick = { copyText(capture.text); message = "Copied to clipboard" }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.ContentCopy, contentDescription = "Copy", tint = muted, modifier = Modifier.size(16.dp)) }
                            if (isLink) TextButton(onClick = { openLink(capture.text) }) { Text("Open", color = muted, fontSize = 10.sp) }
                            IconButton(onClick = { draft = capture.text; editingId = capture.id; message = "" }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.Edit, contentDescription = "Edit", tint = muted, modifier = Modifier.size(16.dp)) }
                            IconButton(onClick = { commit(captures.filterNot { it.id == capture.id }); if (editingId == capture.id) { draft = ""; editingId = null }; message = "Capture deleted" }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete", tint = muted, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = panel), border = androidx.compose.foundation.BorderStroke(1.dp, border), shape = RoundedCornerShape(15.dp)) {
            Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Outlined.Check, contentDescription = null, tint = muted, modifier = Modifier.size(18.dp))
                Column {
                    Text("Private by default", color = main, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text("Local storage · Manual export · No account or cloud sync yet", color = muted, fontSize = 10.sp, lineHeight = 15.sp)
                }
            }
        }
        Text("Linka 0.3.0", color = muted, fontSize = 10.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
    if (settingsOpen) {
        AlertDialog(
            onDismissRequest = { settingsOpen = false },
            containerColor = panel, titleContentColor = main, textContentColor = muted,
            title = { Text("Settings", fontWeight = FontWeight.SemiBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Appearance", color = main, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    listOf("dark" to "Dark", "light" to "Light", "system" to "System default").forEach { (value, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable { onThemeChanged(value) }.padding(vertical = 1.dp)) {
                            RadioButton(selected = themeMode == value, onClick = { onThemeChanged(value) })
                            Text(label, color = main, fontSize = 12.sp)
                        }
                    }
                    Text("Your data stays on this phone. Automatic cross-device sync is not available yet.", color = muted, fontSize = 11.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 8.dp))
                    TextButton(onClick = { settingsOpen = false; termsOpen = true }) { Text("Read user agreement", color = main) }
                }
            },
            confirmButton = { TextButton(onClick = { settingsOpen = false }) { Text("Done", color = main) } }
        )
    }
    if (!agreementAccepted || termsOpen) {
        val initial = !agreementAccepted
        Dialog(onDismissRequest = { if (!initial) termsOpen = false }, properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnBackPress = !initial, dismissOnClickOutside = !initial)) {
            Surface(
                modifier = Modifier.fillMaxWidth(.94f).animateContentSize(),
                shape = RoundedCornerShape(24.dp), color = panel, border = androidx.compose.foundation.BorderStroke(1.dp, border), tonalElevation = 8.dp
            ) {
                Column(Modifier.padding(19.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("linka", color = main, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1).sp)
                        Spacer(Modifier.weight(1f))
                        if (!initial) IconButton(onClick = { termsOpen = false }) { Icon(Icons.Outlined.Close, contentDescription = "Close", tint = muted) }
                    }
                    Text(if (initial) "Before we begin" else "User agreement", color = main, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 5.dp))
                    Text("Please read how Linka stores your captures.", color = muted, fontSize = 11.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 5.dp))
                    Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(top = 12.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        AgreementSection("1. Local storage", "Your captures live in this app on this phone. Clearing app storage, uninstalling the app or losing the device may erase them. Export backups that matter.")
                        AgreementSection("2. No automatic sync", "Accounts, cloud database and cross-device automatic synchronization are not available in this version. Moving data between devices is manual.")
                        AgreementSection("3. Your responsibility", "You are responsible for what you save, your device security and backups. Do not rely on Linka as the only copy of critical information.")
                        AgreementSection("4. External links and early access", "Links open in external apps or websites operated by third parties. Linka is an early-stage utility and is not guaranteed to be error-free.")
                        AgreementSection("5. Lawful use", "Use Linka lawfully and respect other people's rights. Avoid storing sensitive information on devices other people can access.")
                        Text("This in-app agreement is a product notice, not professional legal advice.", color = muted, fontSize = 10.sp, lineHeight = 15.sp)
                    }
                    if (initial) {
                        Button(onClick = onAgree, colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) {
                            Text("I agree and continue", fontWeight = FontWeight.SemiBold)
                        }
                        TextButton(onClick = onDecline, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("Decline and close", color = muted, fontSize = 11.sp) }
                    } else {
                        Button(onClick = { termsOpen = false }, colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(top = 12.dp)) { Text("Done") }
                    }
                }
            }
        }
    }
}

@Composable
private fun AgreementSection(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(body, color = MaterialTheme.colorScheme.onSurface.copy(alpha = .68f), fontSize = 10.sp, lineHeight = 15.sp)
    }
}
private fun Modifier.heightButton() = this.then(Modifier.padding(vertical = 0.dp))