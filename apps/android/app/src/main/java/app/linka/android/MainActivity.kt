package app.linka.android

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.Html
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.NoteAlt
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.SystemUpdate
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.time.LocalDate
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import coil.compose.AsyncImage

private val DB = Color(0xFF09090B)
private val DS = Color(0xFF111114)
private val DR = Color(0xFF1B1B21)
private val DBR = Color(0xFF303039)
private val DT = Color(0xFFEDEDF2)
private val DM = Color(0xFF9696A3)
private val LB = Color(0xFFF5F4F1)
private val LS = Color(0xFFFFFEFC)
private val LR = Color(0xFFF0EEE9)
private val LBR = Color(0xFFDFDDD8)
private val LT = Color(0xFF1A191F)
private val LM = Color(0xFF73717D)
private const val PREFS = "linka_local_v3"
private const val CAPTURES_KEY = "captures"
private const val THEME_KEY = "theme"
private const val ACCENT_KEY = "accent"
private const val LANGUAGE_KEY = "language"
private const val TERMS_KEY = "agreement_accepted"
private const val TERMS_VERSION = "2026-10-23-v2"
private const val ANIMATIONS_KEY = "animations"
const val AMBIENT_AUDIO_KEY = "ambient_audio"
private const val DENSITY_KEY = "interface_density"
private const val EFFECTS_KEY = "visual_effects"
private const val FONT_SCALE_KEY = "font_scale"
private const val UPDATE_ALERTS_KEY = "update_alerts"
internal const val AUTO_DOWNLOAD_KEY = "auto_download_updates"
private const val LAST_NOTIFIED_KEY = "last_notified_version"
private const val DELETED_IDS_KEY = "deleted_capture_ids"
private const val SYNC_URL_KEY = "sync_project_url"
private const val SYNC_ANON_KEY = "sync_anon_key"
private const val SYNC_EMAIL_KEY = "sync_email"
private const val SYNC_REFRESH_KEY = "sync_refresh_token_encrypted"
private const val SYNC_STATUS_KEY = "sync_status"
private const val PROFILE_JSON_KEY = "profile_json"
internal const val MAX_CAPTURE_CHARS = 100_000
internal const val MAX_CAPTURES = 500
private const val RELEASES_API = "https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest"
private const val NOTIFICATION_CHANNEL = "linka_updates"

internal data class Capture(
    val id: String,
    val text: String,
    val createdAt: Long,
    val updatedAt: Long = createdAt,
    val pinned: Boolean = false,
    val previewTitle: String = "",
    val previewDescription: String = "",
    val previewImageUrl: String = ""
)
private data class LinkPreview(val title: String, val description: String, val imageUrl: String)
private data class UpdateInfo(val version: String, val downloadUrl: String, val releaseUrl: String, val changes: String)

internal fun filterCaptures(captures: List<Capture>, filter: String, query: String): List<Capture> = captures.filter { c ->
    val isLink = c.text.startsWith("http://", true) || c.text.startsWith("https://", true)
    val kind = when (filter) { "pinned" -> c.pinned; "links" -> isLink; "notes" -> !isLink; else -> true }
    val host = if (isLink) runCatching { java.net.URI(c.text.trim()).host.orEmpty() }.getOrDefault("") else ""
    val q = query.trim()
    val matches = q.isBlank() || listOf(c.text, c.previewTitle, c.previewDescription, host)
        .any { it.contains(q, ignoreCase = true) }
    kind && matches
}.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt })

private fun captureTypeKey(capture: Capture): String {
    if (!capture.text.startsWith("http://", true) && !capture.text.startsWith("https://", true)) return "notes"
    val host = Uri.parse(capture.text).host.orEmpty().lowercase(Locale.ROOT).removePrefix("www.")
    return when {
        host == "youtu.be" || host.endsWith("youtube.com") || host.endsWith("vimeo.com") || host.endsWith("tiktok.com") -> "video"
        capture.previewTitle.isNotBlank() || capture.previewDescription.isNotBlank() -> "article"
        else -> "website"
    }
}

private suspend fun fetchLinkPreview(value: String): LinkPreview? = withContext(kotlinx.coroutines.Dispatchers.IO) {
    val raw = value.trim()
    if (!raw.startsWith("https://", true) && !raw.startsWith("http://", true)) return@withContext null
    var connection: HttpURLConnection? = null
    try {
        val url = URL(raw)
        if (url.host.isBlank() || url.host.equals("localhost", true) || url.host.endsWith(".local", true)) return@withContext null
        val conn = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 3500
            readTimeout = 4500
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "LinkaAndroid/0.5 (link preview)")
            setRequestProperty("Accept", "text/html,application/xhtml+xml")
        }
        connection = conn
        if (conn.responseCode !in 200..299 || !conn.url.protocol.equals("https", true)) return@withContext null
        if (!conn.contentType.orEmpty().contains("html", true) || conn.contentLengthLong > 2_000_000L) return@withContext null
        val html = conn.inputStream.use { input ->
            val out = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            var total = 0
            while (total < 250_000) {
                val count = input.read(buffer, 0, minOf(buffer.size, 250_000 - total))
                if (count <= 0) break
                out.write(buffer, 0, count)
                total += count
            }
            out.toString("UTF-8")
        }
        fun clean(text: String): String = Html.fromHtml(text, Html.FROM_HTML_MODE_LEGACY)
            .toString().replace(Regex("\\s+"), " ").trim().take(400)
        fun attr(tag: String, name: String): String {
            val match = Regex("""\b$name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""", RegexOption.IGNORE_CASE).find(tag) ?: return ""
            return (1..3).firstNotNullOfOrNull { i -> match.groups[i]?.value?.takeIf { it.isNotBlank() } }.orEmpty()
        }
        var title = ""
        var description = ""
        var image = ""
        Regex("""<meta\b[^>]*>""", RegexOption.IGNORE_CASE).findAll(html).forEach { hit ->
            val tag = hit.value
            val key = attr(tag, "property").ifBlank { attr(tag, "name") }.lowercase(Locale.ROOT)
            val valueText = attr(tag, "content")
            when (key) {
                "og:title", "twitter:title" -> if (title.isBlank()) title = clean(valueText)
                "description", "og:description", "twitter:description" -> if (description.isBlank()) description = clean(valueText)
                "og:image", "twitter:image", "twitter:image:src" -> if (image.isBlank()) image = valueText.trim()
            }
        }
        if (title.isBlank()) title = Regex("""<title\b[^>]*>(.*?)</title>""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
            .find(html)?.groupValues?.getOrNull(1)?.let(::clean).orEmpty()
        if (image.isNotBlank()) {
            image = runCatching { URL(conn.url, image).toString() }.getOrDefault("")
            if (!image.startsWith("https://", true)) image = ""
        }
        LinkPreview(title.ifBlank { conn.url.host.removePrefix("www.") }.take(180), description.take(320), image)
    } catch (_: Exception) {
        null
    } finally {
        connection?.disconnect()
    }
}

private val languages = listOf("az" to "Azərbaycan dili", "en" to "English", "ru" to "Русский", "tr" to "Türkçe")
private val words = mapOf(
    "en" to mapOf(
        "tagline" to "LINKS · NOTES · IDEAS", "home" to "Home", "inbox" to "Inbox", "search" to "Search", "settings" to "Settings",
        "hero" to "Keep what matters.", "heroBody" to "Links, thoughts and text. All in one calm place.",
        "quickCapture" to "Quick capture", "placeholder" to "Write a thought or paste a link…", "save" to "Save to inbox",
        "saved" to "Saved on this phone", "recent" to "Recently saved", "seeAll" to "See all", "yourInbox" to "Your inbox",
        "all" to "All", "pinned" to "Pinned", "links" to "Links", "notes" to "Notes", "items" to "items",
        "empty" to "Nothing here yet", "emptyBody" to "Save something above, or share text from another app to Linka. Migrating from 0.4.72? Export a backup in old Linka, then import it here from Settings → Your data.",
        "private" to "Private by default", "privacyBody" to "Stored on this device. Export a backup whenever you need it.",
        "appearance" to "Appearance", "language" to "App language", "animations" to "Smooth animations", "ambientAudio" to "Ambient sound",
        "fontSize" to "Text size", "updateAlerts" to "Update notifications", "updateAlertsBody" to "Notify me when a newer Android version is released.", "notificationsEnabled" to "Notifications are allowed on this device.", "notificationsBlocked" to "Android is blocking Linka notifications. Enable them in system settings.", "notificationSettings" to "Open notification settings", "testNotification" to "Send test notification",
        "updates" to "App updates", "checkUpdates" to "Check for updates", "checking" to "Checking…", "latest" to "You're up to date",
        "failed" to "Couldn't check for updates. Check your connection and try again.", "available" to "A newer Linka is ready",
        "updateBody" to "A new version is available. Download the APK and confirm installation when Android asks.",
        "updateNow" to "Download update", "later" to "Not now", "updateChanges" to "What's new", "autoDownload" to "Download updates automatically", "autoDownloadBody" to "Download new APKs inside Linka when a release is detected.", "downloadProgress" to "Downloading update", "downloaded" to "Ready to install", "applyUpdate" to "Apply and restart", "downloadFailed" to "Download failed. Check your connection and retry.", "downloadWaiting" to "Preparing download…", "themeDark" to "Dark", "themeLight" to "Light", "themeSystem" to "System",
        "data" to "Your data", "export" to "Export backup", "import" to "Import backup", "clearData" to "Delete all captures",
        "clearConfirm" to "This permanently deletes all captures saved on this device. Export a backup first if you need one.",
        "deleteAll" to "Delete all", "cancel" to "Cancel", "done" to "Done", "agreement" to "User agreement",
        "readAgreement" to "Read user agreement", "beforeBegin" to "Before we begin", "termsIntro" to "A quick note about how Linka handles your data.",
        "agree" to "I agree and continue", "decline" to "Decline and close", "localStorage" to "1. Data on this device",
        "localStorageBody" to "Captures are stored locally on this phone. Clearing app storage, uninstalling the app or losing the device may erase them. Export backups that matter.",
        "noSync" to "2. Optional cloud sync", "noSyncBody" to "Cloud sync is optional and requires a Supabase project you configure. Local storage and manual export/import remain available.",
        "responsibility" to "3. Your responsibility", "responsibilityBody" to "You are responsible for content you save, device security and backups. Do not use Linka as the only copy of critical information.",
        "external" to "4. External services and early access", "externalBody" to "External links open outside Linka. This early version may contain defects and is not guaranteed to be error-free.",
        "lawful" to "5. Lawful use", "lawfulBody" to "Use the app lawfully and respect other people's rights. Avoid saving sensitive information on a device other people can access.",
        "legalNote" to "This notice is not professional legal advice.", "noResults" to "No results", "searchHint" to "Search saved links and notes…",
        "copied" to "Copied to clipboard", "deleted" to "Capture deleted", "edit" to "Edit", "open" to "Open", "copy" to "Copy",
        "delete" to "Delete", "pin" to "Pin", "unpin" to "Unpin", "localOnly" to "Data is stored locally by default. Optional Supabase sync can be configured in Settings.",
        "languageIntro" to "Choose your language", "languageBody" to "You can change this later in Settings.", "continue" to "Continue",
        "importSuccess" to "Backup imported", "importFailed" to "Couldn't read this backup file.", "emptySearch" to "Try another search or filter.",
        "version" to "Version", "manage" to "Personalize your Linka experience", "local" to "ON THIS DEVICE", "loadMore" to "Load more"
    ),
    "ru" to mapOf(
        "tagline" to "ССЫЛКИ · ЗАМЕТКИ · МЫСЛИ", "home" to "Главная", "inbox" to "Сохранённое", "search" to "Поиск", "settings" to "Настройки",
        "hero" to "Сохраняй важное.", "heroBody" to "Ссылки, мысли и текст — в одном спокойном месте.",
        "quickCapture" to "Быстрое сохранение", "placeholder" to "Напиши мысль или вставь ссылку…", "save" to "Сохранить",
        "saved" to "Сохранено на устройстве", "recent" to "Недавно сохранено", "seeAll" to "Все", "yourInbox" to "Твои материалы",
        "all" to "Все", "pinned" to "Закреплённое", "links" to "Ссылки", "notes" to "Заметки", "items" to "шт.",
        "empty" to "Пока здесь пусто", "emptyBody" to "Сохрани запись выше или отправь текст в Linka из другого приложения. Переносишь данные из Linka 0.4.72? Экспортируй копию в старом приложении, затем импортируй её здесь: Настройки → Твои данные.",
        "private" to "Приватность по умолчанию", "privacyBody" to "Данные хранятся на устройстве. При необходимости создай резервную копию.",
        "appearance" to "Внешний вид", "language" to "Язык приложения", "animations" to "Плавные анимации", "ambientAudio" to "Атмосферный звук",
        "fontSize" to "Размер текста", "updateAlerts" to "Уведомления об обновлениях", "updateAlertsBody" to "Сообщать о новых версиях Linka для Android.", "notificationsEnabled" to "Уведомления разрешены на этом устройстве.", "notificationsBlocked" to "Android блокирует уведомления Linka. Разреши их в системных настройках.", "notificationSettings" to "Открыть настройки уведомлений", "testNotification" to "Отправить тестовое уведомление",
        "updates" to "Обновления приложения", "checkUpdates" to "Проверить обновления", "checking" to "Проверяем…", "latest" to "У тебя актуальная версия",
        "failed" to "Не удалось проверить обновления. Проверь подключение и повтори попытку.", "available" to "Доступна новая версия Linka",
        "updateBody" to "Вышла новая версия. Скачай APK и подтверди установку, когда Android попросит.",
        "updateNow" to "Скачать обновление", "later" to "Позже", "updateChanges" to "Что изменилось", "autoDownload" to "Скачивать обновления автоматически", "autoDownloadBody" to "Скачивать новые APK внутри Linka при обнаружении релиза.", "downloadProgress" to "Загрузка обновления", "downloaded" to "Готово к установке", "applyUpdate" to "Применить и перезапустить", "downloadFailed" to "Не удалось скачать. Проверь интернет и повтори.", "downloadWaiting" to "Подготовка загрузки…", "themeDark" to "Тёмная", "themeLight" to "Светлая", "themeSystem" to "Как в системе",
        "data" to "Твои данные", "export" to "Экспортировать копию", "import" to "Импортировать копию", "clearData" to "Удалить все записи",
        "clearConfirm" to "Все записи на этом устройстве будут удалены без возможности отмены. Сначала экспортируй копию, если она нужна.",
        "deleteAll" to "Удалить всё", "cancel" to "Отмена", "done" to "Готово", "agreement" to "Пользовательское соглашение",
        "readAgreement" to "Прочитать соглашение", "beforeBegin" to "Перед началом", "termsIntro" to "Кратко о том, как Linka обращается с твоими данными.",
        "agree" to "Принимаю и продолжаю", "decline" to "Отказаться и закрыть", "localStorage" to "1. Данные на устройстве",
        "localStorageBody" to "Записи хранятся на этом телефоне. Очистка данных приложения, его удаление или потеря устройства могут привести к потере записей. Сохраняй резервные копии.",
        "noSync" to "2. Облачная синхронизация по желанию", "noSyncBody" to "Синхронизация настраивается через собственный проект Supabase. Локальное хранение и ручной экспорт/импорт остаются доступны.",
        "responsibility" to "3. Твоя ответственность", "responsibilityBody" to "Ты отвечаешь за содержимое записей, безопасность устройства и резервные копии. Не храни здесь единственную копию важных данных.",
        "external" to "4. Внешние сервисы и ранняя версия", "externalBody" to "Внешние ссылки открываются вне Linka. В ранней версии возможны ошибки; бесперебойная работа не гарантируется.",
        "lawful" to "5. Законное использование", "lawfulBody" to "Используй приложение законно и уважай права других людей. Не сохраняй чувствительные данные на устройстве, к которому есть чужой доступ.",
        "legalNote" to "Этот текст не является профессиональной юридической консультацией.", "noResults" to "Ничего не найдено", "searchHint" to "Поиск по ссылкам и заметкам…",
        "copied" to "Скопировано", "deleted" to "Запись удалена", "edit" to "Изменить", "open" to "Открыть", "copy" to "Копировать",
        "delete" to "Удалить", "pin" to "Закрепить", "unpin" to "Открепить", "localOnly" to "По умолчанию данные хранятся локально. Облачную синхронизацию Supabase можно настроить в параметрах.",
        "languageIntro" to "Выбери язык", "languageBody" to "Его можно изменить позже в настройках.", "continue" to "Продолжить",
        "importSuccess" to "Резервная копия импортирована", "importFailed" to "Не удалось прочитать файл резервной копии.", "emptySearch" to "Попробуй другой запрос или фильтр.",
        "version" to "Версия", "manage" to "Настрой Linka под себя", "local" to "НА ЭТОМ УСТРОЙСТВЕ"
    ),
    "az" to mapOf(
        "tagline" to "LİNKLƏR · QEYDLƏR · FİKİRLƏR", "home" to "Ana səhifə", "inbox" to "Yadda saxlananlar", "search" to "Axtarış", "settings" to "Tənzimləmələr",
        "hero" to "Vacib olanı saxla.", "heroBody" to "Linklər, fikirlər və mətnlər — hamısı bir yerdə.",
        "quickCapture" to "Tez yadda saxla", "placeholder" to "Fikrini yaz və ya link əlavə et…", "save" to "Yadda saxla",
        "saved" to "Bu telefonda saxlanıldı", "recent" to "Son saxlananlar", "seeAll" to "Hamısı", "yourInbox" to "Sənin qeydlərin",
        "all" to "Hamısı", "pinned" to "Bərkidilənlər", "links" to "Linklər", "notes" to "Qeydlər", "items" to "element",
        "empty" to "Hələ heç nə yoxdur", "emptyBody" to "Yuxarıdan qeyd saxla və ya başqa tətbiqdən mətni Linka-ya göndər. 0.4.72-dən keçirsən? Köhnə tətbiqdə ehtiyat nüsxəni ixrac et, sonra burada Parametrlər → Məlumatların bölməsindən idxal et.",
        "private" to "Məxfilik standartdır", "privacyBody" to "Məlumat bu cihazda saxlanılır. Lazım olduqda ehtiyat nüsxə yarat.",
        "appearance" to "Görünüş", "language" to "Tətbiqin dili", "animations" to "Axıcı animasiyalar", "ambientAudio" to "Atmosfer səsi",
        "fontSize" to "Mətn ölçüsü", "updateAlerts" to "Yeniləmə bildirişləri", "updateAlertsBody" to "Yeni Android versiyası çıxanda xəbər ver.", "notificationsEnabled" to "Bu cihazda bildirişlərə icazə verilib.", "notificationsBlocked" to "Android Linka bildirişlərini bloklayır. Sistem tənzimləmələrində icazə ver.", "notificationSettings" to "Bildiriş tənzimləmələrini aç", "testNotification" to "Test bildirişi göndər",
        "updates" to "Tətbiq yeniləmələri", "checkUpdates" to "Yeniləmələri yoxla", "checking" to "Yoxlanılır…", "latest" to "Ən son versiyadasan",
        "failed" to "Yeniləməni yoxlamaq mümkün olmadı. İnternet bağlantısını yoxla.", "available" to "Yeni Linka versiyası mövcuddur",
        "updateBody" to "Yeni versiya hazırdır. APK faylını endir və Android quraşdırmanı təsdiqləyəndə davam et.",
        "updateNow" to "Yeniləməni endir", "later" to "Sonra", "updateChanges" to "Nələr yenidir", "themeDark" to "Tünd", "themeLight" to "Açıq", "themeSystem" to "Sistem kimi",
        "data" to "Məlumatların", "export" to "Ehtiyat nüsxəni ixrac et", "import" to "Nüsxəni idxal et", "clearData" to "Bütün qeydləri sil",
        "clearConfirm" to "Bu cihazda saxlanılan bütün qeydlər birdəfəlik silinəcək. Lazımdırsa əvvəlcə ehtiyat nüsxə yarat.",
        "deleteAll" to "Hamısını sil", "cancel" to "Ləğv et", "done" to "Hazırdır", "agreement" to "İstifadəçi razılaşması",
        "readAgreement" to "İstifadəçi razılaşmasını oxu", "beforeBegin" to "Başlamazdan əvvəl", "termsIntro" to "Linka-nın məlumatlarını necə saxladığı barədə qısa məlumat.",
        "agree" to "Razıyam və davam et", "decline" to "İmtina et və bağla", "localStorage" to "1. Məlumat cihazda saxlanılır",
        "localStorageBody" to "Qeydlər bu telefonda saxlanılır. Tətbiqin məlumatlarını təmizləmək, onu silmək və ya cihazı itirmək qeydləri itirə bilər. Vacib məlumatların ehtiyat nüsxəsini yarat.",
        "noSync" to "2. İstəyə bağlı bulud sinxronizasiyası", "noSyncBody" to "Sinxronizasiya öz Supabase layihənlə qurulur. Yerli yaddaş və əl ilə ixrac/idxal da mövcuddur.",
        "responsibility" to "3. Sənin məsuliyyətin", "responsibilityBody" to "Saxladığın məzmuna, cihazın təhlükəsizliyinə və ehtiyat nüsxələrə görə sən cavabdehsən. Vacib məlumatın yeganə nüsxəsi kimi Linka-ya güvənmə.",
        "external" to "4. Xarici keçidlər və ilkin versiya", "externalBody" to "Linklər Linka-dan kənarda açılır. İlkin versiyada xətalar ola bilər və fasiləsiz işə zəmanət verilmir.",
        "lawful" to "5. Qanuni istifadə", "lawfulBody" to "Tətbiqdən qanuni istifadə et və başqalarının hüquqlarına hörmət et. Başqalarının daxil ola bildiyi cihazda həssas məlumat saxlama.",
        "legalNote" to "Bu məlumat hüquqi məsləhət deyil.", "noResults" to "Nəticə tapılmadı", "searchHint" to "Link və qeydlərdə axtar…",
        "copied" to "Buferə köçürüldü", "deleted" to "Qeyd silindi", "edit" to "Dəyiş", "open" to "Aç", "copy" to "Köçür",
        "delete" to "Sil", "pin" to "Bərkid", "unpin" to "Aç", "localOnly" to "Məlumat standart olaraq cihazda saxlanılır. Supabase sinxronizasiyasını Parametrlərdən qura bilərsən.",
        "languageIntro" to "Dilini seç", "languageBody" to "Dili sonra tənzimləmələrdən dəyişə bilərsən.", "continue" to "Davam et",
        "importSuccess" to "Ehtiyat nüsxə idxal edildi", "importFailed" to "Ehtiyat nüsxə faylını oxumaq mümkün olmadı.", "emptySearch" to "Başqa axtarış və ya filtr yoxla.",
        "version" to "Versiya", "manage" to "Linka-nı özünə uyğunlaşdır", "local" to "BU CİHAZDA"
    ),
    "tr" to mapOf(
        "tagline" to "BAĞLANTILAR · NOTLAR · FİKİRLER", "home" to "Ana sayfa", "inbox" to "Kaydedilenler", "search" to "Ara", "settings" to "Ayarlar",
        "hero" to "Önemli olanı sakla.", "heroBody" to "Bağlantılar, düşünceler ve metinler tek bir yerde.",
        "quickCapture" to "Hızlı kaydet", "placeholder" to "Bir düşünce yaz veya bağlantı yapıştır…", "save" to "Kaydet",
        "saved" to "Bu telefona kaydedildi", "recent" to "Son kaydedilenler", "seeAll" to "Tümü", "yourInbox" to "Kaydedilenlerin",
        "all" to "Tümü", "pinned" to "Sabitlenenler", "links" to "Bağlantılar", "notes" to "Notlar", "items" to "öğe",
        "empty" to "Henüz bir şey yok", "emptyBody" to "Yukarıdan kaydet veya başka uygulamadan metni Linka'ya paylaş. 0.4.72'den geçiş yapıyor musun? Eski uygulamada yedeği dışa aktar, sonra burada Ayarlar → Verilerin bölümünden içe aktar.",
        "private" to "Varsayılan olarak gizli", "privacyBody" to "Veriler bu cihazda tutulur. Gerektiğinde yedek dışa aktar.",
        "appearance" to "Görünüm", "language" to "Uygulama dili", "animations" to "Akıcı animasyonlar", "ambientAudio" to "Ortam sesi",
        "fontSize" to "Metin boyutu", "updateAlerts" to "Güncelleme bildirimleri", "updateAlertsBody" to "Yeni Android sürümü çıktığında bildir.", "notificationsEnabled" to "Bu cihazda bildirimlere izin verildi.", "notificationsBlocked" to "Android Linka bildirimlerini engelliyor. Sistem ayarlarından izin ver.", "notificationSettings" to "Bildirim ayarlarını aç", "testNotification" to "Test bildirimi gönder",
        "updates" to "Uygulama güncellemeleri", "checkUpdates" to "Güncellemeleri kontrol et", "checking" to "Kontrol ediliyor…", "latest" to "Güncelsin",
        "failed" to "Güncellemeler kontrol edilemedi. Bağlantını kontrol edip tekrar dene.", "available" to "Yeni Linka sürümü hazır",
        "updateBody" to "Yeni bir sürüm var. APK dosyasını indir ve Android istediğinde kurulumu onayla.",
        "updateNow" to "Güncellemeyi indir", "later" to "Daha sonra", "updateChanges" to "Yenilikler", "themeDark" to "Koyu", "themeLight" to "Açık", "themeSystem" to "Sistem",
        "data" to "Verilerin", "export" to "Yedeği dışa aktar", "import" to "Yedeği içe aktar", "clearData" to "Tüm kayıtları sil",
        "clearConfirm" to "Bu cihazdaki tüm kayıtlar kalıcı olarak silinecek. Gerekliyse önce yedek oluştur.",
        "deleteAll" to "Tümünü sil", "cancel" to "İptal", "done" to "Tamam", "agreement" to "Kullanıcı sözleşmesi",
        "readAgreement" to "Kullanıcı sözleşmesini oku", "beforeBegin" to "Başlamadan önce", "termsIntro" to "Linka'nın verilerini nasıl tuttuğuna dair kısa bilgi.",
        "agree" to "Kabul et ve devam et", "decline" to "Reddet ve kapat", "localStorage" to "1. Cihazda depolama",
        "localStorageBody" to "Kayıtlar bu telefonda tutulur. Uygulama verilerini temizlemek, uygulamayı kaldırmak veya cihazı kaybetmek kayıtları silebilir. Önemli verileri yedekle.",
        "noSync" to "2. İsteğe bağlı bulut senkronizasyonu", "noSyncBody" to "Senkronizasyon kendi Supabase projenle yapılandırılır. Yerel depolama ve manuel dışa/içe aktarma kullanılabilir.",
        "responsibility" to "3. Sorumluluk", "responsibilityBody" to "Kaydettiğin içerik, cihaz güvenliği ve yedeklerden sen sorumlusun. Kritik verilerin tek kopyası olarak Linka'ya güvenme.",
        "external" to "4. Harici hizmetler ve erken erişim", "externalBody" to "Harici bağlantılar Linka dışında açılır. Bu erken sürüm hata içerebilir; kesintisiz çalışma garantisi yoktur.",
        "lawful" to "5. Yasal kullanım", "lawfulBody" to "Uygulamayı yasalara uygun kullan ve başkalarının haklarına saygı göster. Başkalarının erişebildiği cihazlarda hassas bilgi tutma.",
        "legalNote" to "Bu metin profesyonel hukuki tavsiye değildir.", "noResults" to "Sonuç bulunamadı", "searchHint" to "Bağlantı ve notlarda ara…",
        "copied" to "Panoya kopyalandı", "deleted" to "Kayıt silindi", "edit" to "Düzenle", "open" to "Aç", "copy" to "Kopyala",
        "delete" to "Sil", "pin" to "Sabitle", "unpin" to "Sabitlemeyi kaldır", "localOnly" to "Veriler varsayılan olarak cihazda tutulur. Supabase senkronizasyonu Ayarlar bölümünden kurulabilir.",
        "languageIntro" to "Dilini seç", "languageBody" to "Bunu daha sonra Ayarlar'dan değiştirebilirsin.", "continue" to "Devam",
        "importSuccess" to "Yedek içe aktarıldı", "importFailed" to "Yedek dosyası okunamadı.", "emptySearch" to "Başka bir arama veya filtre dene.",
        "version" to "Sürüm", "manage" to "Linka deneyimini kişiselleştir", "local" to "BU CİHAZDA"
    )
)
private val extraWords = mapOf(
    "en" to mapOf(
        "video" to "VIDEO", "article" to "ARTICLE", "website" to "WEBSITE",
        "rememberTitle" to "A little throwback", "rememberBody" to "Something you saved a while ago.",
        "readMore" to "Read more", "showLess" to "Show less",
        "cloudSync" to "Cloud sync", "cloudSyncBody" to "Keep this library in sync between devices using the same account.",
        "syncNow" to "Connect and sync", "createAccount" to "Create account",
        "syncEndpoint" to "Supabase project URL", "syncAnonKey" to "Publishable key", "syncEmail" to "Account email",
        "syncPassword" to "Six-digit email code", "syncSendCode" to "Send sign-in code",
        "syncRegisterCode" to "Create account · send code", "syncCodeSent" to "Code sent. Check your inbox and spam folder.",
        "syncNeedCode" to "Request a fresh email code first.", "syncOtpExpired" to "Code expired. Request a new one.",
        "syncQrApproved" to "Desktop sign-in approved.", "syncNeedSignInForQr" to "Sign in to approve the QR request.",
        "syncWait" to "Resend available in", "syncVerifyAndSync" to "Verify code and sync",
        "syncHelp" to "Use your email to create an account or sign in. Your Linka library is available on devices using the same account.",
        "syncConfig" to "Connection settings", "syncSetupHint" to "These settings are normally set by Linka. Change them only if you need a different project.",
        "profileTitle" to "A quick intro", "profilePrompt" to "Choose a display name. A nickname is fine; age is optional.",
        "profileName" to "Display name", "profileAge" to "Age (optional)", "profileSave" to "Save profile",
        "syncSetupSql" to "Copy database setup SQL", "syncForget" to "Forget this account", "syncClose" to "Close",
        "syncWorking" to "Syncing…", "syncCopied" to "SQL copied. Run it in Supabase → SQL Editor.",
        "syncRequired" to "Cloud sync needs a configured Linka service. Until connected, Linka continues to work locally.",
        "syncLatest" to "Last sync", "syncOpen" to "Set up cloud sync", "syncOffline" to "Continue offline"
    ),
    "ru" to mapOf(
        "video" to "ВИДЕО", "article" to "СТАТЬЯ", "website" to "САЙТ",
        "rememberTitle" to "Из прошлого", "rememberBody" to "То, что ты сохранил некоторое время назад.",
        "readMore" to "Развернуть", "showLess" to "Свернуть",
        "cloudSync" to "Облачная синхронизация", "cloudSyncBody" to "Синхронизируй библиотеку между устройствами с одним аккаунтом.",
        "syncNow" to "Подключить и синхронизировать", "createAccount" to "Создать аккаунт",
        "syncEndpoint" to "URL проекта Supabase", "syncAnonKey" to "Публичный ключ", "syncEmail" to "Электронная почта",
        "syncPassword" to "Код из 6 цифр", "syncSendCode" to "Получить код для входа",
        "syncRegisterCode" to "Создать аккаунт · получить код", "syncCodeSent" to "Код отправлен. Проверь почту и папку «Спам».",
        "syncNeedCode" to "Сначала запроси новый код из письма.", "syncOtpExpired" to "Срок действия кода истёк. Запроси новый.",
        "syncQrApproved" to "Вход на компьютере подтверждён.", "syncNeedSignInForQr" to "Войди в аккаунт, чтобы подтвердить QR-вход.",
        "syncWait" to "Повторный код через", "syncVerifyAndSync" to "Подтвердить код и синхронизировать",
        "syncHelp" to "Создай аккаунт или войди по коду из письма. Библиотека будет доступна на устройствах с этим аккаунтом.",
        "syncConfig" to "Настройки подключения", "syncSetupHint" to "Обычно эти настройки уже заданы в Linka. Меняй их только при необходимости.",
        "profileTitle" to "Немного о тебе", "profilePrompt" to "Выбери отображаемое имя. Можно использовать псевдоним; возраст необязателен.",
        "profileName" to "Как тебя называть", "profileAge" to "Возраст (необязательно)", "profileSave" to "Сохранить профиль",
        "syncSetupSql" to "Скопировать SQL для базы", "syncForget" to "Отключить этот аккаунт", "syncClose" to "Закрыть",
        "syncWorking" to "Синхронизация…", "syncCopied" to "SQL скопирован. Выполни его в Supabase → SQL Editor.",
        "syncRequired" to "Облачная синхронизация ещё не подключена. Пока Linka продолжит работать локально.",
        "syncLatest" to "Последняя синхронизация", "syncOpen" to "Настроить синхронизацию", "syncOffline" to "Продолжить без аккаунта"
    ),
    "az" to mapOf(
        "video" to "VİDEO", "article" to "MƏQALƏ", "website" to "SAYT",
        "rememberTitle" to "Keçmişdən bir xatirə", "rememberBody" to "Bir müddət əvvəl saxladığın material.",
        "readMore" to "Daha çox", "showLess" to "Yığcam et",
        "cloudSync" to "Bulud sinxronizasiyası", "cloudSyncBody" to "Kitabxananı eyni hesabla cihazlar arasında sinxronlaşdır.",
        "syncNow" to "Qoşul və sinxronlaşdır", "createAccount" to "Hesab yarat",
        "syncEndpoint" to "Supabase layihəsinin URL-i", "syncAnonKey" to "Açıq layihə açarı", "syncEmail" to "E-poçt",
        "syncPassword" to "6 rəqəmli e-poçt kodu", "syncSendCode" to "Giriş kodu göndər",
        "syncRegisterCode" to "Hesab yarat · kod göndər", "syncCodeSent" to "Kod göndərildi. E-poçtu və spam qovluğunu yoxla.",
        "syncNeedCode" to "Əvvəlcə yeni e-poçt kodu istə.", "syncOtpExpired" to "Kodun vaxtı bitib. Yenidən istə.",
        "syncQrApproved" to "Kompüter girişinə icazə verildi.", "syncNeedSignInForQr" to "QR girişini təsdiqləmək üçün hesabına daxil ol.",
        "syncWait" to "Yeni kod üçün qalan vaxt", "syncVerifyAndSync" to "Təsdiqlə və sinxronlaşdır",
        "syncHelp" to "E-poçt kodu ilə hesab yarat və ya daxil ol. Linka kitabxanan eyni hesabın olduğu cihazlarda əlçatan olacaq.",
        "syncConfig" to "Bağlantı parametrləri", "syncSetupHint" to "Bu parametrlər adətən Linka tərəfindən verilir. Başqa layihə istifadə edəcəksənsə dəyiş.",
        "profileTitle" to "Özün haqqında", "profilePrompt" to "Görünən adını seç. Ləqəb istifadə edə bilərsən; yaş istəyə bağlıdır.",
        "profileName" to "Görünən ad", "profileAge" to "Yaş (istəyə görə)", "profileSave" to "Profili saxla",
        "syncSetupSql" to "Baza SQL-ini kopyala", "syncForget" to "Hesabı ayır", "syncClose" to "Bağla",
        "syncWorking" to "Sinxronizasiya…", "syncCopied" to "SQL kopyalandı. Supabase → SQL Editor bölməsində icra et.",
        "syncRequired" to "Bulud sinxronizasiyası hələ qoşulmayıb. Linka lokal işləməyə davam edəcək.",
        "syncLatest" to "Son sinxronizasiya", "syncOpen" to "Sinxronizasiyanı qur", "syncOffline" to "Hesabsız davam et"
    ),
    "tr" to mapOf(
        "video" to "VİDEO", "article" to "MAKALE", "website" to "WEB SİTESİ",
        "rememberTitle" to "Geçmişten bir hatırlatma", "rememberBody" to "Bir süre önce kaydettiğin bir içerik.",
        "readMore" to "Daha fazla", "showLess" to "Daha az",
        "cloudSync" to "Bulut senkronizasyonu", "cloudSyncBody" to "Kitaplığını aynı hesabı kullanan cihazlar arasında eşitle.",
        "syncNow" to "Bağlan ve eşitle", "createAccount" to "Hesap oluştur",
        "syncEndpoint" to "Supabase proje URL'si", "syncAnonKey" to "Yayınlanabilir anahtar", "syncEmail" to "E-posta",
        "syncPassword" to "6 haneli e-posta kodu", "syncSendCode" to "Giriş kodu gönder",
        "syncRegisterCode" to "Hesap oluştur · kod gönder", "syncCodeSent" to "Kod gönderildi. Gelen kutunu ve spam klasörünü kontrol et.",
        "syncNeedCode" to "Önce yeni bir e-posta kodu iste.", "syncOtpExpired" to "Kodun süresi doldu. Yeni bir kod iste.",
        "syncQrApproved" to "Masaüstü girişine izin verildi.", "syncNeedSignInForQr" to "QR girişini onaylamak için hesabına giriş yap.",
        "syncWait" to "Yeni kod için kalan süre", "syncVerifyAndSync" to "Kodu doğrula ve eşitle",
        "syncHelp" to "E-posta koduyla hesap oluştur veya giriş yap. Linka kitaplığın aynı hesabın açık olduğu cihazlarda kullanılabilir.",
        "syncConfig" to "Bağlantı ayarları", "syncSetupHint" to "Bu ayarlar normalde Linka tarafından yapılandırılır. Başka bir proje kullanacaksan değiştir.",
        "profileTitle" to "Biraz kendinden bahset", "profilePrompt" to "Görünecek bir ad seç. Takma ad kullanabilirsin; yaş isteğe bağlıdır.",
        "profileName" to "Görünen ad", "profileAge" to "Yaş (isteğe bağlı)", "profileSave" to "Profili kaydet",
        "syncSetupSql" to "Veritabanı SQL'ini kopyala", "syncForget" to "Bu hesabı unut", "syncClose" to "Kapat",
        "syncWorking" to "Eşitleniyor…", "syncCopied" to "SQL kopyalandı. Supabase → SQL Editor'da çalıştır.",
        "syncRequired" to "Bulut eşitlemesi henüz bağlanmadı. Linka yerel çalışmayı sürdürecek.",
        "syncLatest" to "Son eşitleme", "syncOpen" to "Bulut eşitlemesini kur", "syncOffline" to "Hesapsız devam et"
    )
)
private fun localizeUpdateNotes(raw: String, lang: String): String {
    val source = raw.lines().map { it.trim().removePrefix("•").removePrefix("-").removePrefix("*").trim() }.filter { it.isNotBlank() }
    val lines = mutableListOf<String>()
    if (source.any { it.contains("signing key", true) || it.contains("migration from Linka 0.4.72", true) }) {
        lines += when (lang) {
            "ru" -> "Важно: эта версия устанавливается рядом со старой Linka. Экспортируй резервную копию в старом приложении и импортируй её здесь перед удалением старой версии."
            "az" -> "Vacib: bu versiya köhnə Linka ilə yanaşı quraşdırılır. Köhnə tətbiqdən ehtiyat nüsxəni ixrac et və onu burada idxal etmədən əvvəlki versiyanı silmə."
            "tr" -> "Önemli: bu sürüm eski Linka'nın yanına kurulur. Eski uygulamadan yedek dışa aktar ve eski sürümü kaldırmadan önce burada içe aktar."
            else -> "Important: this version installs alongside old Linka. Export a backup from the old app and import it here before removing the old version."
        }
    }
    source.forEach { line ->
        val lower = line.lowercase(Locale.ROOT)
        val translated = when {
            "ambient sphere" in lower || "pulsing sphere" in lower -> when (lang) {
                "ru" -> "Добавлена медленно пульсирующая фиолетово-графитовая сфера на фоне."
                "az" -> "Arxa fona yavaş nəbz vuran bənövşəyi-qrafit kürə əlavə edildi."
                "tr" -> "Arka plana yavaşça nabız atan mor-grafit küre eklendi."
                else -> "Added a slowly pulsing violet-graphite ambient sphere."
            }
            "transparent navigation" in lower || "spring navigation" in lower || "navigation pill" in lower -> when (lang) {
                "ru" -> "Нижняя навигация стала прозрачной; активный раздел плавно перемещается с упругим откликом."
                "az" -> "Alt naviqasiya şəffaf oldu; aktiv bölmə yumşaq animasiya ilə hərəkət edir."
                "tr" -> "Alt gezinme şeffaflaştı; etkin bölüm yumuşak bir animasyonla hareket ediyor."
                else -> "Made bottom navigation translucent with a smooth, spring-like active state."
            }
            "ambient sound" in lower || "synth pad" in lower -> when (lang) {
                "ru" -> "Добавлен необязательный тихий атмосферный синтезаторный фон; он выключен по умолчанию."
                "az" -> "İstəyə bağlı sakit atmosfer sintezator səsi əlavə edildi; standart olaraq sönülüdür."
                "tr" -> "İsteğe bağlı, sakin bir ortam synth sesi eklendi; varsayılan olarak kapalıdır."
                else -> "Added optional, quiet ambient synth audio; disabled by default."
            }
            "notification" in lower -> when (lang) {
                "ru" -> "Уточнены уведомления и отображение состояния обновлений."
                "az" -> "Bildirişlər və yeniləmə statusunun göstərilməsi təkmilləşdirildi."
                "tr" -> "Bildirimler ve güncelleme durumunun gösterimi iyileştirildi."
                else -> "Improved notification and update-status feedback."
            }
            "release notes" in lower || "localized update" in lower -> when (lang) {
                "ru" -> "Сведения об изменениях отображаются на выбранном языке."
                "az" -> "Dəyişiklik qeydləri seçilmiş dildə göstərilir."
                "tr" -> "Sürüm notları seçilen dilde gösterilir."
                else -> "Release notes now follow the selected app language."
            }
            "shorter, calmer page transitions" in lower || "visual jumping" in lower -> when (lang) {
                "ru" -> "Переходы между разделами стали короче и плавнее."
                "az" -> "Bölmələr arasındakı keçidlər qısaldıldı və yumşaldıldı."
                "tr" -> "Bölümler arası geçişler kısaltıldı ve yumuşatıldı."
                else -> "Shorter, calmer transitions between sections."
            }
            "inbox renders" in lower || "limited batch" in lower -> when (lang) {
                "ru" -> "Список загружает записи партиями, снижая нагрузку при запуске."
                "az" -> "Siyahı başlanğıc yükünü azaltmaq üçün qeydləri hissə-hissə göstərir."
                "tr" -> "Gelen kutusu açılış yükünü azaltmak için kayıtları gruplar halinde gösterir."
                else -> "The inbox renders items in batches to reduce initial work."
            }
            "r8" in lower || "resource shrinking" in lower -> when (lang) {
                "ru" -> "Оптимизирована сборка Android: уменьшены код и ресурсы приложения."
                "az" -> "Android yığımı optimallaşdırıldı: kod və resursların ölçüsü azaldıldı."
                "tr" -> "Android derlemesi optimize edildi; kod ve kaynak boyutu küçültüldü."
                else -> "Optimized the Android build with code and resource shrinking."
            }
            "highest supported refresh rate" in lower -> when (lang) {
                "ru" -> "Приложение запрашивает максимальную поддерживаемую частоту экрана; фактическая частота зависит от устройства."
                "az" -> "Tətbiq ekranın dəstəklədiyi ən yüksək yenilənmə tezliyini istəyir; faktiki tezlik cihazdan asılıdır."
                "tr" -> "Uygulama ekranın desteklediği en yüksek yenileme hızını ister; gerçek hız cihaza bağlıdır."
                else -> "Requests the display's highest supported refresh rate; actual FPS depends on the device."
            }
            "motion remains native" in lower || "disabled in settings" in lower -> when (lang) {
                "ru" -> "Анимации можно отключить в настройках."
                "az" -> "Animasiyaları parametrlərdə söndürmək olar."
                "tr" -> "Animasyonlar ayarlardan kapatılabilir."
                else -> "Animations can be disabled in Settings."
            }
            else -> null
        }
        val displayLine = translated ?: line
        if (displayLine !in lines) lines += displayLine
    }
    if (lines.isEmpty()) {
        return when (lang) {
            "ru" -> "• Более плавная навигация и улучшенная работа интерфейса\n• Уточнены уведомления и проверка обновлений"
            "az" -> "• Daha hamar naviqasiya və təkmilləşdirilmiş interfeys\n• Bildirişlər və yeniləmə yoxlaması yaxşılaşdırıldı"
            "tr" -> "• Daha akıcı gezinme ve iyileştirilmiş arayüz\n• Bildirimler ve güncelleme denetimi iyileştirildi"
            else -> "• Smoother navigation and interface refinements\n• Improved notifications and update checks"
        }
    }
    return lines.take(8).joinToString("\n") { "• $it" }
}

private fun tr(lang: String, key: String) = words[lang]?.get(key) ?: extraWords[lang]?.get(key) ?: words["en"]?.get(key) ?: extraWords["en"]?.get(key) ?: key

/**
 * Quiet locally-generated ambient pad. Optional, offline, and intentionally subtle.
 */
private object AmbientAudioEngine {
    @Volatile private var track: AudioTrack? = null

    @Synchronized fun start() {
        if (track?.playState == AudioTrack.PLAYSTATE_PLAYING) return
        stop()
        val sampleRate = 44_100
        val seconds = 12
        val frames = sampleRate * seconds
        val pcm = ShortArray(frames * 2)
        for (i in 0 until frames) {
            val t = i.toDouble() / sampleRate
            val swell = 0.55 + 0.20 * kotlin.math.sin(2.0 * Math.PI * t / seconds)
            val pad = kotlin.math.sin(2.0 * Math.PI * 110.0 * t) * 0.38 +
                kotlin.math.sin(2.0 * Math.PI * 164.81 * t) * 0.25 +
                kotlin.math.sin(2.0 * Math.PI * 220.0 * t) * 0.16 +
                kotlin.math.sin(2.0 * Math.PI * 329.63 * t) * 0.07
            val value = (pad * swell * 0.085 * Short.MAX_VALUE).toInt().coerceIn(-32768, 32767).toShort()
            pcm[i * 2] = value
            pcm[i * 2 + 1] = value
        }
        val bytes = ByteArray(pcm.size * 2)
        for (i in pcm.indices) {
            val v = pcm[i].toInt()
            bytes[i * 2] = (v and 0xff).toByte()
            bytes[i * 2 + 1] = ((v shr 8) and 0xff).toByte()
        }
        val audio = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
            .setAudioFormat(AudioFormat.Builder().setSampleRate(sampleRate).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build())
            .setBufferSizeInBytes(bytes.size)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        val written = audio.write(bytes, 0, bytes.size)
        if (written <= 0) { audio.release(); return }
        audio.setVolume(0.7f)
        audio.setLoopPoints(0, frames, -1)
        audio.play()
        track = audio
    }

    @Synchronized fun stop() {
        runCatching { track?.pause() }
        runCatching { track?.flush() }
        runCatching { track?.release() }
        track = null
    }
}

class MainActivity : ComponentActivity() {
    private var incomingSharedText by mutableStateOf("")
    private var incomingSharedToken by mutableIntStateOf(0)
    private var incomingPairingToken by mutableIntStateOf(0)
    private var incomingOAuthToken by mutableIntStateOf(0)
    private var updateInfo by mutableStateOf<UpdateInfo?>(null)
    private var updateStatus by mutableStateOf("")
    private var checkingUpdates by mutableStateOf(false)
    private var downloadingUpdate by mutableStateOf(false)
    private var downloadProgress by mutableIntStateOf(0)
    private var downloadedApkPath by mutableStateOf<String?>(null)
    private var downloadFailed by mutableStateOf(false)
    private var downloadFailureReason by mutableStateOf("")
    private var notificationsAllowed by mutableStateOf(false)
    private var waitingForInstallPermission = false
    private var permissionDialogPending = false
    private var appInForeground by mutableStateOf(false)
    private fun prefs() = getSharedPreferences(PREFS, MODE_PRIVATE)
    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(NOTIFICATION_CHANNEL) == null) {
            manager.createNotificationChannel(
                NotificationChannel(NOTIFICATION_CHANNEL, "Linka updates", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Notifications about new Linka versions and update status"
                }
            )
        }
    }

    private fun canPostNotifications(): Boolean {
        ensureNotificationChannel()
        val appAllowed = NotificationManagerCompat.from(this).areNotificationsEnabled()
        val runtimeAllowed = Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        val channelAllowed = Build.VERSION.SDK_INT < 26 ||
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).getNotificationChannel(NOTIFICATION_CHANNEL)?.importance?.let { it != NotificationManager.IMPORTANCE_NONE } == true
        return appAllowed && runtimeAllowed && channelAllowed
    }
    private fun openNotificationSettings() {
        val intent = if (Build.VERSION.SDK_INT >= 26) Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
        else Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
        runCatching { startActivity(intent) }
    }
    private fun sendTestNotification() {
        if (!canPostNotifications()) {
            val lacksRuntimePermission = Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            if (lacksRuntimePermission) {
                permissionDialogPending = true
                prefs().edit().putBoolean("notification_permission_asked", true).apply()
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7402)
            } else {
                openNotificationSettings()
            }
            return
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(NotificationChannel(NOTIFICATION_CHANNEL, "Linka updates", NotificationManager.IMPORTANCE_DEFAULT))
        }
        val language = (prefs().getString(LANGUAGE_KEY, "") ?: "").ifBlank { Locale.getDefault().language }.lowercase(Locale.ROOT)
        val title = when (language) {
            "ru" -> "Уведомления Linka работают"
            "az" -> "Linka bildirişləri işləyir"
            "tr" -> "Linka bildirimleri çalışıyor"
            else -> "Linka notifications are working"
        }
        val body = when (language) {
            "ru" -> "Это тестовое уведомление. Системные уведомления разрешены."
            "az" -> "Bu test bildirişidir. Sistem bildirişlərinə icazə verilib."
            "tr" -> "Bu bir test bildirimidir. Sistem bildirimlerine izin verildi."
            else -> "This is a test notification. System notifications are allowed."
        }
        val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java)
        val pending = PendingIntent.getActivity(this, 43, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(this, NOTIFICATION_CHANNEL) else {
            @Suppress("DEPRECATION")
            android.app.Notification.Builder(this)
        }
        manager.notify(4108, notification.setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(title).setContentText(body).setContentIntent(pending).setAutoCancel(true).build())
    }
    private fun appVersion() = runCatching { packageManager.getPackageInfo(packageName, 0).versionName ?: "0.4.0" }.getOrDefault("0.4.0")
    private fun loadCaptures(): List<Capture> = try {
        val array = JSONArray(prefs().getString(CAPTURES_KEY, "[]") ?: "[]")
        (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            val value = o.optString("text", "").trim()
            val created = o.optLong("createdAt", 0L)
            if (value.isBlank() || created <= 0L) null else Capture(
                o.optString("id", UUID.randomUUID().toString()), value.take(MAX_CAPTURE_CHARS),
                created, o.optLong("updatedAt", created), o.optBoolean("pinned", false),
                o.optString("previewTitle", ""), o.optString("previewDescription", ""), o.optString("previewImageUrl", "")
            )
        }.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt }).take(MAX_CAPTURES)
    } catch (_: Exception) { emptyList() }
    private fun saveCaptures(list: List<Capture>) {
        val array = JSONArray()
        list.take(MAX_CAPTURES).forEach { c ->
            array.put(JSONObject().put("id", c.id).put("text", c.text.take(MAX_CAPTURE_CHARS))
                .put("createdAt", c.createdAt).put("updatedAt", c.updatedAt).put("pinned", c.pinned)
                .put("previewTitle", c.previewTitle).put("previewDescription", c.previewDescription).put("previewImageUrl", c.previewImageUrl))
        }
        prefs().edit().putString(CAPTURES_KEY, array.toString()).apply()
    }
    private fun openExternal(value: String) { runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(value.trim()))) } }
    private fun copyText(value: String) {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Linka", value))
    }

    private fun rememberPairingIntent(value: Intent?) {
        val uri = value?.data ?: return
        if (!uri.scheme.equals("linka", ignoreCase = true)) return
        if (uri.host.equals("pair", ignoreCase = true)) {
            val id = uri.getQueryParameter("id").orEmpty()
            val secret = uri.getQueryParameter("secret").orEmpty()
            if (id.isBlank() || secret.length < 32) return
            prefs().edit().putString("pending_pair_id", id).putString("pending_pair_secret", secret).apply()
            incomingPairingToken++
            return
        }
        if (uri.host.equals("auth", ignoreCase = true) && uri.path.equals("/callback", ignoreCase = true)) {
            val fragment = uri.fragment.orEmpty()
            val params = Uri.parse("https://linka.invalid/?$fragment")
            val access = params.getQueryParameter("access_token").orEmpty()
            val refresh = params.getQueryParameter("refresh_token").orEmpty()
            if (access.isBlank() || refresh.isBlank()) {
                prefs().edit().putString("oauth_callback_error", params.getQueryParameter("error_description").orEmpty()).apply()
                incomingOAuthToken++
                return
            }
            prefs().edit().putString("oauth_pending_access", access)
                .putString("oauth_pending_refresh", refresh)
                .remove("oauth_callback_error").apply()
            incomingOAuthToken++
        }
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val preferredRate = window.decorView.display?.supportedModes?.maxByOrNull { it.refreshRate }?.refreshRate
            if (preferredRate != null && preferredRate > 0f) {
                window.attributes = window.attributes.apply { preferredRefreshRate = preferredRate }
            }
        }
        ensureNotificationChannel()
        notificationsAllowed = canPostNotifications()
        scheduleUpdateChecks()
        incomingSharedText = extractSharedText(intent)
        incomingSharedToken = 1
        rememberPairingIntent(intent)
        checkForUpdate(true)
        setContent {
            var theme by remember { mutableStateOf(prefs().getString(THEME_KEY, "dark") ?: "dark") }
            var accent by remember { mutableStateOf(prefs().getString(ACCENT_KEY, "violet") ?: "violet") }
            var language by remember { mutableStateOf(prefs().getString(LANGUAGE_KEY, "") ?: "") }
            var accepted by remember { mutableStateOf(prefs().getString(TERMS_KEY, "") == TERMS_VERSION) }
            var animations by remember { mutableStateOf(prefs().getBoolean(ANIMATIONS_KEY, true) && !android.provider.Settings.Global.getFloat(contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f).equals(0f)) }
            var ambientAudio by remember { mutableStateOf(prefs().getBoolean(AMBIENT_AUDIO_KEY, false)) }
            var density by remember { mutableStateOf(prefs().getString(DENSITY_KEY, "standard") ?: "standard") }
            var effects by remember { mutableStateOf(prefs().getString(EFFECTS_KEY, "balanced") ?: "balanced") }
            var fontScale by remember { mutableFloatStateOf(prefs().getFloat(FONT_SCALE_KEY, 1f).coerceIn(.9f, 1.2f)) }
            var alerts by remember { mutableStateOf(prefs().getBoolean(UPDATE_ALERTS_KEY, true)) }
            var autoDownload by remember { mutableStateOf(prefs().getBoolean(AUTO_DOWNLOAD_KEY, false)) }
            val darkSystem = androidx.compose.foundation.isSystemInDarkTheme()
            val dark = theme == "dark" || theme == "oled" || (theme == "system" && darkSystem)
            val accentColor = when (accent) {
                "blue" -> if (dark) Color(0xFF9CC5FF) else Color(0xFF356BB4)
                "mint" -> if (dark) Color(0xFF8FE3CF) else Color(0xFF237A68)
                "rose" -> if (dark) Color(0xFFFFB6D2) else Color(0xFFB14E78)
                else -> if (dark) Color(0xFFC9C0FF) else Color(0xFF6554A6)
            }
            val backgroundColor = if (theme == "oled") Color.Black else DB
            val surfaceColor = if (theme == "oled") Color(0xFF050507) else DS
            val raisedColor = if (theme == "oled") Color(0xFF111116) else DR
            val outlineColor = if (theme == "oled") Color(0xFF26242D) else DBR
            MaterialTheme(colorScheme = if (dark) darkColorScheme(
                background = backgroundColor, surface = surfaceColor, primary = accentColor, onPrimary = Color(0xFF171323), onBackground = DT, onSurface = DT, surfaceVariant = raisedColor, outline = outlineColor
            ) else lightColorScheme(
                background = LB, surface = LS, primary = accentColor, onPrimary = Color(0xFFFFFFFF), onBackground = LT, onSurface = LT, surfaceVariant = LR, outline = LBR
            )) {
                LinkaApp(
                    sharedText = incomingSharedText, sharedTrigger = incomingSharedToken, pairingTrigger = incomingPairingToken, oauthTrigger = incomingOAuthToken,
                    load = { loadCaptures() }, save = { saveCaptures(it) },
                    copy = { copyText(it) }, open = { openExternal(it) },
                    theme = theme, setTheme = { theme = it; prefs().edit().putString(THEME_KEY, it).apply() },
                    accent = accent, setAccent = { accent = it; prefs().edit().putString(ACCENT_KEY, it).apply() },
                    language = language, setLanguage = { language = it; prefs().edit().putString(LANGUAGE_KEY, it).apply() },
                    animations = animations, setAnimations = { animations = it; prefs().edit().putBoolean(ANIMATIONS_KEY, it).apply() },
                    ambientAudio = ambientAudio, setAmbientAudio = { ambientAudio = it; prefs().edit().putBoolean(AMBIENT_AUDIO_KEY, it).apply() },
                    density = density, setDensity = { density = it; prefs().edit().putString(DENSITY_KEY, it).apply() },
                    effects = effects, setEffects = { effects = it; prefs().edit().putString(EFFECTS_KEY, it).apply() },
                    fontScale = fontScale, setFontScale = { fontScale = it; prefs().edit().putFloat(FONT_SCALE_KEY, it).apply() },
                    alerts = alerts, notificationPermissionGranted = notificationsAllowed, openNotificationSettings = { openNotificationSettings() }, sendTestNotification = { sendTestNotification() }, setAlerts = { enabled ->
                        if (enabled && Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                            permissionDialogPending = true
                            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7402)
                        }
                        alerts = enabled
                        prefs().edit().putBoolean(UPDATE_ALERTS_KEY, enabled).apply()
                        if (enabled && updateInfo != null) notifyUpdate(updateInfo!!)
                    },
                    updateInfo = updateInfo, updateStatus = updateStatus, checking = checkingUpdates,
                    checkUpdates = { checkForUpdate(false) }, openUpdate = { startUpdateDownload(it) },
                    autoDownload = autoDownload, setAutoDownload = { enabled ->
                        autoDownload = enabled
                        prefs().edit().putBoolean(AUTO_DOWNLOAD_KEY, enabled).apply()
                        if (enabled && updateInfo != null && downloadedApkPath == null && !downloadingUpdate) startUpdateDownload(updateInfo!!)
                    }, downloadProgress = downloadProgress, downloadingUpdate = downloadingUpdate,
                    downloaded = downloadedApkPath != null, downloadFailed = downloadFailed, downloadFailureReason = downloadFailureReason,
                    applyUpdate = { installDownloadedUpdate() }, retryDownload = { updateInfo?.let { startUpdateDownload(it) } },
                    version = appVersion(), accepted = accepted, appInForeground = appInForeground,
                    agree = {
                        prefs().edit().putString(TERMS_KEY, TERMS_VERSION).apply()
                        accepted = true
                        if (Build.VERSION.SDK_INT >= 33 && alerts &&
                            !prefs().getBoolean("notification_permission_asked", false) &&
                            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                            prefs().edit().putBoolean("notification_permission_asked", true).apply()
                            permissionDialogPending = true
                            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7402)
                        }
                    },
                    decline = { finish() }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        rememberPairingIntent(intent)
        incomingSharedText = extractSharedText(intent)
        incomingSharedToken++
    }

    override fun onResume() {
        super.onResume()
        appInForeground = true
        if (prefs().getBoolean(AMBIENT_AUDIO_KEY, false)) AmbientAudioEngine.start()
        notificationsAllowed = canPostNotifications()
        val now = System.currentTimeMillis()
        val lastForegroundCheck = prefs().getLong("last_foreground_update_check", 0L)
        if (now - lastForegroundCheck > 30L * 60L * 1000L) {
            prefs().edit().putLong("last_foreground_update_check", now).apply()
            checkForUpdate(true)
        }
        if (waitingForInstallPermission && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && packageManager.canRequestPackageInstalls()) {
            waitingForInstallPermission = false
            installDownloadedUpdate()
        }
        if (permissionDialogPending) {
            permissionDialogPending = false
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                val found = updateInfo
                if (found != null) {
                    if (notifyUpdate(found)) prefs().edit().putString(LAST_NOTIFIED_KEY, found.version).apply()
                } else checkForUpdate(true)
            }
        }
    }

    override fun onPause() {
        appInForeground = false
        AmbientAudioEngine.stop()
        super.onPause()
    }

    private fun extractSharedText(intent: Intent?): String {
        if (intent == null) return ""
        return when (intent.action) {
            Intent.ACTION_SEND -> intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString().orEmpty().take(MAX_CAPTURE_CHARS)
            Intent.ACTION_PROCESS_TEXT -> intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString().orEmpty().take(MAX_CAPTURE_CHARS)
            else -> ""
        }
    }

    private fun scheduleUpdateChecks() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val request = PeriodicWorkRequestBuilder<UpdateCheckWorker>(
            6, java.util.concurrent.TimeUnit.HOURS, 30, java.util.concurrent.TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setInitialDelay(1, java.util.concurrent.TimeUnit.HOURS)
            .build()
        val workManager = WorkManager.getInstance(applicationContext)
        workManager.enqueueUniqueWork(
            "linka-update-check-now", ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<UpdateCheckWorker>()
                .setConstraints(constraints)
                .setInitialDelay(5, java.util.concurrent.TimeUnit.SECONDS)
                .build()
        )
        workManager.enqueueUniquePeriodicWork("linka-update-checks", ExistingPeriodicWorkPolicy.KEEP, request)
    }

    private fun startUpdateDownload(info: UpdateInfo) {
        if (downloadingUpdate) return
        val safeVersion = info.version.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val cachedApk = File(File(cacheDir, "updates"), "linka-update-$safeVersion.apk")
        if (cachedApk.isFile && cachedApk.length() > 1024L) {
            val validationError = validateLinkaUpdateApk(this, cachedApk)
            if (validationError == null) {
                downloadedApkPath = cachedApk.absolutePath
                downloadProgress = 100
                downloadFailed = false
                downloadFailureReason = ""
                return
            }
            cachedApk.delete()
        }
        if (!info.downloadUrl.startsWith("https://")) {
            downloadFailed = true
            return
        }
        downloadingUpdate = true
        downloadFailed = false
        downloadFailureReason = ""
        downloadProgress = 0
        downloadedApkPath = null
        Thread {
            var finalFile: File? = null
            try {
                val connection = (URL(info.downloadUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15000
                    readTimeout = 20000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "Linka-Android")
                    setRequestProperty("Accept", "application/octet-stream")
                }
                try {
                    val code = connection.responseCode
                    if (code !in 200..299) error("Download HTTP $code")
                    val total = connection.contentLengthLong
                    if (total > 200L * 1024L * 1024L) error("APK exceeds size limit")
                    val folder = File(cacheDir, "updates").apply { mkdirs() }
                    val temp = File(folder, "linka-update.apk.part")
                    if (temp.exists()) temp.delete()
                    connection.inputStream.use { input ->
                        FileOutputStream(temp).use { output ->
                            val buffer = ByteArray(32 * 1024)
                            var read: Int
                            var count = 0L
                            var lastProgress = -1
                            while (input.read(buffer).also { read = it } != -1) {
                                count += read
                                if (count > 200L * 1024L * 1024L) error("APK exceeds size limit")
                                output.write(buffer, 0, read)
                                if (total > 0L) {
                                    val percent = ((count * 100L) / total).toInt().coerceIn(0, 100)
                                    if (percent != lastProgress) {
                                        lastProgress = percent
                                        runOnUiThread { downloadProgress = percent }
                                    }
                                }
                            }
                            output.fd.sync()
                        }
                    }
                    if (!temp.isFile || temp.length() < 1024L) error("Downloaded file is incomplete")
                    val signature = temp.inputStream().use { input -> ByteArray(4).also { input.read(it) } }
                    if (!(signature[0] == 0x50.toByte() && signature[1] == 0x4b.toByte())) error("Downloaded file is not an APK archive")
                    validateLinkaUpdateApk(this@MainActivity, temp)?.let { error(it) }
                    finalFile = File(folder, "linka-update-${info.version.replace(Regex("[^A-Za-z0-9._-]"), "_")}.apk")
                    if (finalFile!!.exists()) finalFile!!.delete()
                    if (!temp.renameTo(finalFile!!)) error("Could not finalize update")
                } finally {
                    connection.disconnect()
                }
            } catch (exception: Exception) {
                finalFile?.delete()
                runOnUiThread {
                    downloadingUpdate = false
                    downloadFailed = true
                    downloadFailureReason = exception.message?.take(220).orEmpty()
                    downloadedApkPath = null
                    downloadProgress = 0
                }
                return@Thread
            }
            val path = finalFile?.absolutePath
            runOnUiThread {
                downloadingUpdate = false
                downloadFailed = false
                downloadedApkPath = path
                downloadProgress = 100
            }
        }.start()
    }

    private fun installDownloadedUpdate() {
        val path = downloadedApkPath ?: return
        val file = File(path)
        if (!file.isFile || file.length() < 1024L) {
            downloadedApkPath = null
            downloadFailed = true
            downloadFailureReason = "The downloaded APK is missing or incomplete."
            return
        }
        val validationError = validateLinkaUpdateApk(this, file)
        if (validationError != null) {
            file.delete()
            downloadedApkPath = null
            downloadFailed = true
            downloadFailureReason = validationError
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            waitingForInstallPermission = true
            val settings = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))
            runCatching { startActivity(settings) }.onFailure {
                waitingForInstallPermission = false
                downloadFailed = true
                downloadFailureReason = it.message?.take(220).orEmpty()
            }
            return
        }
        runCatching {
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
            val install = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(install)
        }.onFailure {
            downloadFailed = true
            downloadFailureReason = it.message?.take(220).orEmpty()
        }
    }

    private fun checkForUpdate(quiet: Boolean) {
        if (checkingUpdates) return
        checkingUpdates = true
        Thread {
            var newer: UpdateInfo? = null
            var status = ""
            try {
                val conn = URL(RELEASES_API).openConnection() as HttpURLConnection
                conn.connectTimeout = 7000
                conn.readTimeout = 7000
                conn.setRequestProperty("Accept", "application/vnd.github+json")
                conn.setRequestProperty("User-Agent", "Linka-Android")
                try {
                    if (conn.responseCode == 200) {
                        val release = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
                        val tag = release.optString("tag_name", "").removePrefix("v")
                        val assets = release.optJSONArray("assets") ?: JSONArray()
                        var apk = ""
                        for (i in 0 until assets.length()) {
                            val asset = assets.optJSONObject(i) ?: continue
                            if (asset.optString("name").endsWith(".apk", true)) {
                                apk = asset.optString("browser_download_url")
                                if (asset.optString("name").contains("release", true)) break
                            }
                        }
                        if (tag.isNotBlank() && apk.isNotBlank() && compareVersion(tag, appVersion()) > 0) {
                            val releaseUrl = release.optString("html_url", "https://github.com/anarabbasov2010-eng/Linka/releases")
                            val notes = release.optString("body", "").lineSequence()
                                .map { it.trim().removePrefix("- ").removePrefix("* ").removePrefix("• ") }
                                .filter { it.isNotBlank() && !it.startsWith("Automated Android build", true) && !it.startsWith("Install the APK", true) }
                                .take(5).joinToString("\n") { "• $it" }
                            newer = UpdateInfo(tag, apk, releaseUrl, notes.ifBlank { "• Faster startup and smoother transitions\n• UI refinements and more reliable update checks" })
                        } else if (!quiet) status = "latest"
                    } else if (!quiet) status = "failed"
                } finally { conn.disconnect() }
            } catch (_: Exception) { if (!quiet) status = "failed" }
            runOnUiThread {
                checkingUpdates = false
                updateInfo = newer
                updateStatus = status
                if (newer != null) {
                    if (prefs().getBoolean(UPDATE_ALERTS_KEY, true)) {
                        val last = prefs().getString(LAST_NOTIFIED_KEY, "") ?: ""
                        if (last != newer!!.version && notifyUpdate(newer!!)) {
                            prefs().edit().putString(LAST_NOTIFIED_KEY, newer!!.version).apply()
                        }
                    }
                    if (prefs().getBoolean(AUTO_DOWNLOAD_KEY, false) && downloadedApkPath == null && !downloadingUpdate) {
                        startUpdateDownload(newer!!)
                    }
                }
            }
        }.start()
    }

    private fun compareVersion(a: String, b: String): Int {
        val x = Regex("[0-9]+").findAll(a).map { it.value.toLongOrNull() ?: 0L }.toList()
        val y = Regex("[0-9]+").findAll(b).map { it.value.toLongOrNull() ?: 0L }.toList()
        for (i in 0 until maxOf(x.size, y.size)) {
            val left = x.getOrElse(i) { 0L }; val right = y.getOrElse(i) { 0L }
            if (left != right) return left.compareTo(right)
        }
        return 0
    }

    private fun notifyUpdate(info: UpdateInfo): Boolean {
        if (!canPostNotifications()) return false
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureNotificationChannel()
        val pending = PendingIntent.getActivity(this, 42, packageManager.getLaunchIntentForPackage(packageName) ?: Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val language = (prefs().getString(LANGUAGE_KEY, "") ?: "").ifBlank { Locale.getDefault().language }.lowercase(Locale.ROOT)
        val title = when (language) {
            "ru" -> "Доступна Linka ${info.version}"
            "az" -> "Linka ${info.version} mövcuddur"
            "tr" -> "Linka ${info.version} hazır"
            else -> "Linka ${info.version} is available"
        }
        val body = when (language) {
            "ru" -> "Нажми, чтобы посмотреть изменения и установить обновление."
            "az" -> "Dəyişikliklərə baxmaq və yeniləməni quraşdırmaq üçün toxun."
            "tr" -> "Değişiklikleri görmek ve güncellemeyi kurmak için dokun."
            else -> "Tap to review changes and install the update."
        }
        val notification = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(this, NOTIFICATION_CHANNEL) else {
            @Suppress("DEPRECATION") android.app.Notification.Builder(this)
        }
        manager.notify(4107, notification.setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(android.app.Notification.BigTextStyle().bigText(body))
            .setContentIntent(pending).setAutoCancel(true)
            .setPriority(android.app.Notification.PRIORITY_DEFAULT).build())
        return true
    }
}

@Composable
private fun LinkaApp(
    sharedText: String, sharedTrigger: Int, pairingTrigger: Int, oauthTrigger: Int, load: () -> List<Capture>, save: (List<Capture>) -> Unit, copy: (String) -> Unit, open: (String) -> Unit,
    theme: String, setTheme: (String) -> Unit, accent: String, setAccent: (String) -> Unit, language: String, setLanguage: (String) -> Unit,
    animations: Boolean, setAnimations: (Boolean) -> Unit, ambientAudio: Boolean, setAmbientAudio: (Boolean) -> Unit, density: String, setDensity: (String) -> Unit, effects: String, setEffects: (String) -> Unit, fontScale: Float, setFontScale: (Float) -> Unit,
    alerts: Boolean, notificationPermissionGranted: Boolean, openNotificationSettings: () -> Unit, sendTestNotification: () -> Unit, setAlerts: (Boolean) -> Unit, updateInfo: UpdateInfo?, updateStatus: String, checking: Boolean,
    checkUpdates: () -> Unit, openUpdate: (UpdateInfo) -> Unit,
    autoDownload: Boolean, setAutoDownload: (Boolean) -> Unit, downloadProgress: Int, downloadingUpdate: Boolean,
    downloaded: Boolean, downloadFailed: Boolean, downloadFailureReason: String, applyUpdate: () -> Unit, retryDownload: () -> Unit,
    version: String, accepted: Boolean, appInForeground: Boolean, agree: () -> Unit, decline: () -> Unit
) {
    val lang = language.ifBlank { "en" }
    val dark = theme == "oled" || MaterialTheme.colorScheme.background == DB
    val bg = if (theme == "oled") Color.Black else if (dark) DB else LB
    val panel = if (theme == "oled") Color(0xFF050507) else if (dark) DS else LS
    val raised = if (theme == "oled") Color(0xFF111116) else if (dark) DR else LR
    val border = if (theme == "oled") Color(0xFF26242D) else if (dark) DBR else LBR
    val main = if (dark) DT else LT
    val muted = if (dark) DM else LM
    val context = LocalContext.current
    val sphereAccent = MaterialTheme.colorScheme.primary
    LaunchedEffect(ambientAudio) { if (ambientAudio) AmbientAudioEngine.start() else AmbientAudioEngine.stop() }
    DisposableEffect(Unit) { onDispose { AmbientAudioEngine.stop() } }
    val ambientTransition = rememberInfiniteTransition(label = "linka-sphere")
    val ambientPulse by ambientTransition.animateFloat(initialValue = 0f, targetValue = 1f, animationSpec = infiniteRepeatable(animation = tween(durationMillis = 15_000, easing = LinearEasing), repeatMode = RepeatMode.Reverse), label = "sphere-pulse")
    var captures by remember { mutableStateOf(load()) }
    var draft by remember { mutableStateOf(sharedText) }
    var editingId by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") }
    var tab by remember { mutableStateOf(0) }
    var languageDialog by remember { mutableStateOf(false) }
    var agreementDialog by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var updatePromptDismissed by remember { mutableStateOf(false) }
    var visibleLimit by remember { mutableIntStateOf(30) }
    var deleting by remember { mutableStateOf<Capture?>(null) }
    var clearDialog by remember { mutableStateOf(false) }
    var cloudDialog by remember { mutableStateOf(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SYNC_REFRESH_KEY, "").isNullOrBlank()) }
    var cloudConfigExpanded by remember { mutableStateOf(false) }
    var emailSignInExpanded by remember { mutableStateOf(false) }
    var profileDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val storedProfile = remember { runCatching { JSONObject(prefs.getString(PROFILE_JSON_KEY, "{}") ?: "{}") }.getOrDefault(JSONObject()) }
    var profileName by remember { mutableStateOf(storedProfile.optString("displayName", "")) }
    var profileAge by remember { mutableStateOf(if (storedProfile.isNull("age")) "" else storedProfile.optString("age", "")) }
    fun localProfileJson(): JSONObject? = runCatching {
        val raw = prefs.getString(PROFILE_JSON_KEY, "").orEmpty()
        if (raw.isBlank()) null else JSONObject(raw)
    }.getOrNull()
    fun keepSyncedProfile(profile: JSONObject?) {
        if (profile != null && profile.optString("displayName").isNotBlank()) {
            prefs.edit().putString(PROFILE_JSON_KEY, profile.toString()).apply()
            profileName = profile.optString("displayName")
            profileAge = if (profile.isNull("age")) "" else profile.optString("age", "")
        }
    }
    var cloudUrl by remember { mutableStateOf(prefs.getString(SYNC_URL_KEY, "").takeIf { !it.isNullOrBlank() } ?: BuildConfig.LINKA_SUPABASE_URL) }
    var cloudAnonKey by remember { mutableStateOf(prefs.getString(SYNC_ANON_KEY, "").takeIf { !it.isNullOrBlank() } ?: BuildConfig.LINKA_SUPABASE_PUBLISHABLE_KEY) }
    var cloudEmail by remember { mutableStateOf(prefs.getString(SYNC_EMAIL_KEY, "") ?: "") }
    var cloudPassword by remember { mutableStateOf("") }
    var cloudOtp by remember { mutableStateOf("") }
    var otpRequested by remember { mutableStateOf(prefs.getLong("otp_expires_at", 0L) > System.currentTimeMillis()) }
    var otpResendUntil by remember { mutableLongStateOf(prefs.getLong("otp_resend_until", 0L)) }
    var otpExpiresAt by remember { mutableLongStateOf(prefs.getLong("otp_expires_at", 0L)) }
    var otpRemainingSeconds by remember { mutableIntStateOf(((prefs.getLong("otp_expires_at", 0L) - System.currentTimeMillis()).coerceAtLeast(0L) / 1000L).toInt()) }
    var otpCooldownSeconds by remember { mutableIntStateOf(((prefs.getLong("otp_resend_until", 0L) - System.currentTimeMillis()).coerceAtLeast(0L) / 1000L).toInt()) }
    var pendingPairId by remember { mutableStateOf(prefs.getString("pending_pair_id", "") ?: "") }
    var pendingPairSecret by remember { mutableStateOf(prefs.getString("pending_pair_secret", "") ?: "") }
    var cloudBusy by remember { mutableStateOf(false) }
    var cloudStatus by remember { mutableStateOf(prefs.getString(SYNC_STATUS_KEY, "") ?: "") }
    var pendingSyncJob by remember { mutableStateOf<Job?>(null) }
    fun requestEmailCode(createAccount: Boolean) {
        if (otpCooldownSeconds > 0) {
            cloudStatus = "${tr(lang, "syncWait")} ${otpCooldownSeconds}s"
            return
        }
        cloudBusy = true
        scope.launch {
            try {
                prefs.edit().putString(SYNC_URL_KEY, cloudUrl.trim().trimEnd('/'))
                    .putString(SYNC_ANON_KEY, cloudAnonKey.trim())
                    .putString(SYNC_EMAIL_KEY, cloudEmail.trim()).apply()
                requestEmailOtp(cloudUrl, cloudAnonKey, cloudEmail, createAccount)
                otpRequested = true
                cloudOtp = ""
                otpResendUntil = System.currentTimeMillis() + 120_000L
                otpExpiresAt = System.currentTimeMillis() + 120_000L
                prefs.edit().putLong("otp_resend_until", otpResendUntil)
                    .putLong("otp_expires_at", otpExpiresAt).apply()
                otpRemainingSeconds = 120
                otpCooldownSeconds = 120
                cloudStatus = tr(lang, "syncCodeSent")
            } catch (e: Exception) {
                cloudStatus = e.message ?: tr(lang, "failed")
            } finally {
                cloudBusy = false
            }
        }
    }
    LaunchedEffect(otpRequested, otpResendUntil, otpExpiresAt) {
        while (true) {
            val now = System.currentTimeMillis()
            otpRemainingSeconds = if (otpRequested) ((otpExpiresAt - now).coerceAtLeast(0L) / 1000L).toInt() else 0
            otpCooldownSeconds = ((otpResendUntil - now).coerceAtLeast(0L) / 1000L).toInt()
            if (otpCooldownSeconds == 0 && (!otpRequested || otpRemainingSeconds == 0)) break
            delay(1000L)
        }
    }
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) runCatching {
            val raw = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } ?: error("empty file")
            val array = JSONArray(raw)
            val imported = (0 until array.length()).mapNotNull { i ->
                val o = array.optJSONObject(i) ?: return@mapNotNull null
                val text = o.optString("text", "").trim().take(MAX_CAPTURE_CHARS)
                if (text.isBlank()) null else {
                    val now = System.currentTimeMillis()
                    Capture(o.optString("id", UUID.randomUUID().toString()), text, o.optLong("createdAt", now), o.optLong("updatedAt", now), o.optBoolean("pinned", false),
                    o.optString("previewTitle", ""), o.optString("previewDescription", ""), o.optString("previewImageUrl", ""))
                }
            }
            captures = (imported + captures).distinctBy { it.id }.take(MAX_CAPTURES)
            save(captures)
            message = tr(lang, "importSuccess")
        }.onFailure { message = tr(lang, "importFailed") }
    }
    fun commit(list: List<Capture>) {
        val normalized = list.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt }).take(MAX_CAPTURES)
        val nextIds = normalized.map { it.id }.toSet()
        val goneIds = captures.filterNot { it.id in nextIds }.map { it.id }
        if (goneIds.isNotEmpty()) {
            val stored = JSONArray(prefs.getString(DELETED_IDS_KEY, "[]") ?: "[]")
            val ids = linkedSetOf<String>()
            for (i in 0 until stored.length()) stored.optString(i).takeIf { it.isNotBlank() }?.let(ids::add)
            ids.addAll(goneIds)
            prefs.edit().putString(DELETED_IDS_KEY, JSONArray().apply { ids.toList().takeLast(5000).forEach { put(it) } }.toString()).apply()
        }
        captures = normalized
        save(captures)
        val token = prefs.getString(SYNC_REFRESH_KEY, "").orEmpty()
        val url = prefs.getString(SYNC_URL_KEY, "").orEmpty()
        val anon = prefs.getString(SYNC_ANON_KEY, "").orEmpty()
        val email = prefs.getString(SYNC_EMAIL_KEY, "").orEmpty()
        if (token.isNotBlank() && url.isNotBlank() && anon.isNotBlank() && email.isNotBlank()) {
            pendingSyncJob?.cancel()
            pendingSyncJob = scope.launch {
                delay(1200L)
                try {
                    val rawDeleted = JSONArray(prefs.getString(DELETED_IDS_KEY, "[]") ?: "[]")
                    val deleted = (0 until rawDeleted.length()).map { rawDeleted.optString(it) }.filter { it.isNotBlank() }.toSet()
                    val result = syncWithSupabase(url, anon, email, "", false, captures, deleted, prefs.getString(SYNC_REFRESH_KEY, "").orEmpty(), localProfileJson())
                    prefs.edit().putString(SYNC_REFRESH_KEY, result.encryptedRefreshToken)
                        .putString(DELETED_IDS_KEY, JSONArray().apply { result.deletedIds.forEach { put(it) } }.toString())
                        .putString(SYNC_STATUS_KEY, result.message).apply()
                    captures = result.captures
                    save(result.captures)
                    keepSyncedProfile(result.profile)
                    cloudStatus = result.message
                } catch (e: Exception) {
                    cloudStatus = e.message ?: "Cloud sync failed"
                }
            }
        }
    }
    LaunchedEffect(accepted, language) {
        if (!accepted || language.isBlank()) return@LaunchedEffect
        if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isBlank() &&
            !prefs.getBoolean("account_intro_shown", false) && pendingPairId.isBlank()) {
            prefs.edit().putBoolean("account_intro_shown", true).apply()
            cloudDialog = true
        }
    }
    LaunchedEffect(sharedText, sharedTrigger) {
        val incoming = sharedText.trim().take(MAX_CAPTURE_CHARS)
        if (incoming.isNotBlank()) {
            val now = System.currentTimeMillis()
            val existing = captures.firstOrNull { it.text.equals(incoming, ignoreCase = true) }
            if (existing == null) commit(listOf(Capture(UUID.randomUUID().toString(), incoming, now, now)) + captures)
            else commit(captures.map { if (it.id == existing.id) it.copy(updatedAt = now) else it })
            draft = ""
            editingId = null
            message = tr(lang, "saved")
            tab = 0
        }
    }
    LaunchedEffect(accepted, appInForeground) {
        if (!accepted || !appInForeground) return@LaunchedEffect
        val url = prefs.getString(SYNC_URL_KEY, "").orEmpty()
        val anon = prefs.getString(SYNC_ANON_KEY, "").orEmpty()
        val email = prefs.getString(SYNC_EMAIL_KEY, "").orEmpty()
        if (url.isBlank() || anon.isBlank() || email.isBlank()) return@LaunchedEffect
        while (appInForeground && accepted) {
            val token = prefs.getString(SYNC_REFRESH_KEY, "").orEmpty()
            if (token.isNotBlank()) {
                runCatching {
                    val rawDeleted = JSONArray(prefs.getString(DELETED_IDS_KEY, "[]") ?: "[]")
                    val deleted = (0 until rawDeleted.length()).map { rawDeleted.optString(it) }.filter { it.isNotBlank() }.toSet()
                    val result = syncWithSupabase(url, anon, email, "", false, load(), deleted, token, localProfileJson())
                    prefs.edit().putString(SYNC_REFRESH_KEY, result.encryptedRefreshToken)
                        .putString(DELETED_IDS_KEY, JSONArray().apply { result.deletedIds.forEach { put(it) } }.toString())
                        .putString(SYNC_STATUS_KEY, result.message).apply()
                    captures = result.captures
                    save(result.captures)
                    keepSyncedProfile(result.profile)
                    cloudStatus = result.message
                }.onFailure { cloudStatus = it.message ?: "Cloud sync failed" }
            }
            delay(60_000L)
        }
    }
    LaunchedEffect(pairingTrigger) {
        if (pairingTrigger > 0) {
            pendingPairId = prefs.getString("pending_pair_id", "").orEmpty()
            pendingPairSecret = prefs.getString("pending_pair_secret", "").orEmpty()
        }
    }
    LaunchedEffect(oauthTrigger) {
        if (oauthTrigger <= 0) return@LaunchedEffect
        val callbackError = prefs.getString("oauth_callback_error", "").orEmpty()
        if (callbackError.isNotBlank()) {
            cloudStatus = callbackError.take(220)
            prefs.edit().remove("oauth_callback_error").apply()
            cloudDialog = true
            return@LaunchedEffect
        }
        val access = prefs.getString("oauth_pending_access", "").orEmpty()
        val refresh = prefs.getString("oauth_pending_refresh", "").orEmpty()
        if (access.isBlank() || refresh.isBlank()) return@LaunchedEffect
        cloudBusy = true
        try {
            val oauth = completeGoogleOAuthSession(cloudUrl, cloudAnonKey, access, refresh)
            prefs.edit().putString(SYNC_REFRESH_KEY, oauth.encryptedRefreshToken)
                .putString(SYNC_EMAIL_KEY, oauth.email)
                .remove("oauth_pending_access").remove("oauth_pending_refresh").apply()
            cloudEmail = oauth.email
            if (profileName.isBlank() && oauth.displayName.isNotBlank()) profileName = oauth.displayName
            cloudStatus = "Google sign-in complete."
            if (localProfileJson()?.optString("displayName").isNullOrBlank()) {
                profileDialog = true
                cloudDialog = false
            } else {
                cloudDialog = true
            }
        } catch (e: Exception) {
            cloudStatus = e.message ?: "Google sign-in could not be completed."
            cloudDialog = true
        } finally {
            cloudBusy = false
        }
    }
    LaunchedEffect(pendingPairId, pendingPairSecret, cloudDialog) {
        if (pendingPairId.isBlank() || pendingPairSecret.isBlank()) return@LaunchedEffect
        val encrypted = prefs.getString(SYNC_REFRESH_KEY, "").orEmpty()
        val url = cloudUrl
        val key = cloudAnonKey
        if (encrypted.isBlank()) {
            cloudDialog = true
            cloudStatus = tr(lang, "syncNeedSignInForQr")
            return@LaunchedEffect
        }
        if (url.isBlank() || key.isBlank()) {
            cloudDialog = true
            cloudStatus = tr(lang, "syncNeedSignInForQr")
            return@LaunchedEffect
        }
        cloudBusy = true
        runCatching {
            val updated = approveQrPairing(url, key, encrypted, pendingPairId, pendingPairSecret)
            prefs.edit().putString(SYNC_REFRESH_KEY, updated)
                .remove("pending_pair_id").remove("pending_pair_secret").apply()
            pendingPairId = ""
            pendingPairSecret = ""
            cloudStatus = tr(lang, "syncQrApproved")
            message = tr(lang, "syncQrApproved")
        }.onFailure {
            cloudStatus = it.message ?: tr(lang, "failed")
            message = cloudStatus
        }
        cloudBusy = false
    }
    val visible = filterCaptures(captures, filter, if (tab == 2) query else "")
    val oldCaptures = captures.filter { it.updatedAt < System.currentTimeMillis() - 7L * 24L * 60L * 60L * 1000L }
    val resurfaced = if (oldCaptures.isEmpty()) null else oldCaptures[LocalDate.now().dayOfYear % oldCaptures.size]
    LaunchedEffect(tab, filter, query) { visibleLimit = 30 }

    if (language.isBlank()) {
        LanguageWelcome(dark, animations, onContinue = { setLanguage(it) })
        return
    }

    Scaffold(
        containerColor = bg,
        contentWindowInsets = WindowInsets.statusBars,
        bottomBar = {
            NavigationBar(modifier = Modifier.background(Brush.verticalGradient(listOf(Color.Transparent, panel.copy(alpha = .76f)))), containerColor = Color.Transparent, tonalElevation = 0.dp, windowInsets = WindowInsets.navigationBars) {
                val items = listOf(
                    Triple(0, Icons.Outlined.Home, tr(lang, "home")),
                    Triple(1, Icons.Outlined.Inbox, tr(lang, "inbox")),
                    Triple(2, Icons.Outlined.Search, tr(lang, "search")),
                    Triple(3, Icons.Outlined.Settings, tr(lang, "settings"))
                )
                items.forEach { (id, icon, label) ->
                    val selected = tab == id
                    val iconScale by androidx.compose.animation.core.animateFloatAsState(targetValue = if (selected) 1.08f else 1f, animationSpec = spring(dampingRatio = .58f, stiffness = 520f), label = "nav-impact-$id")
                    NavigationBarItem(selected = selected, onClick = { tab = id },
                        icon = {
                            Box(Modifier.size(44.dp, 30.dp).graphicsLayer { scaleX = iconScale; scaleY = iconScale }.background(if (selected) sphereAccent.copy(alpha = .20f) else Color.Transparent, CircleShape), contentAlignment = Alignment.Center) {
                                Icon(icon, contentDescription = label, modifier = Modifier.size(21.dp))
                            }
                        },
                        label = { Text(label, fontSize = 10.sp * fontScale, maxLines = 1) }, alwaysShowLabel = true,
                        colors = androidx.compose.material3.NavigationBarItemDefaults.colors(indicatorColor = Color.Transparent, selectedIconColor = sphereAccent, unselectedIconColor = muted, selectedTextColor = main, unselectedTextColor = muted))
                }
            }
        }
    ) { padding ->
        AnimatedContent(
            targetState = tab, modifier = Modifier.fillMaxSize().padding(padding),
            transitionSpec = {
                if (animations) (fadeIn(tween(durationMillis = 170)) + slideInVertically(tween(durationMillis = 190)) { it / 70 }) togetherWith
                    (fadeOut(tween(durationMillis = 120)) + slideOutVertically(tween(durationMillis = 130)) { -it / 90 })
                else fadeIn(tween(durationMillis = 90)) togetherWith fadeOut(tween(durationMillis = 90))
            }, label = "linka-page"
        ) { page ->
            Column(Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    if (theme == "oled") listOf(Color.Black, Color.Black, Color.Black)
                    else if (dark) when (effects) {
                        "quiet" -> listOf(DB, DB, DB)
                        "atmosphere" -> listOf(Color(0xFF1A1626), DB, Color(0xFF08080C))
                        else -> listOf(Color(0xFF111016), DB, Color(0xFF08080C))
                    }
                    else when (effects) {
                        "quiet" -> listOf(LB, LB, LB)
                        "atmosphere" -> listOf(Color(0xFFF9F6FF), LB, Color(0xFFEEEAF6))
                        else -> listOf(Color(0xFFFFFEFC), LB, Color(0xFFF1EFEB))
                    }
                )
            ).drawBehind {
                if (theme != "oled" && effects != "quiet" && animations) {
                    val center = Offset(size.width * .52f, size.height * .13f)
                    val radius = size.width * (.27f + .012f * ambientPulse)
                    val strength = if (effects == "atmosphere") .19f else .10f
                    val glowRadius = radius * 1.85f
                    drawCircle(
                        brush = Brush.radialGradient(
                            listOf(sphereAccent.copy(alpha = strength * .68f), Color(0xFF7564B5).copy(alpha = strength * .34f), Color.Transparent),
                            center = center, radius = glowRadius
                        ), radius = glowRadius, center = center
                    )
                    drawCircle(
                        brush = Brush.radialGradient(
                            listOf(sphereAccent.copy(alpha = strength + .025f * ambientPulse), Color(0xFF4B3A7A).copy(alpha = strength * .74f), Color(0xFF181321).copy(alpha = strength * .35f), Color.Transparent),
                            center = center, radius = radius
                        ), radius = radius, center = center
                    )
                    val highlight = Offset(center.x - radius * .32f, center.y - radius * .34f)
                    drawCircle(
                        brush = Brush.radialGradient(
                            listOf(Color.White.copy(alpha = .075f), sphereAccent.copy(alpha = .035f), Color.Transparent),
                            center = highlight, radius = radius * .62f
                        ), radius = radius * .62f, center = highlight
                    )
                }
            }.verticalScroll(rememberScrollState()).imePadding()
                .padding(horizontal = 18.dp).padding(top = 14.dp, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(when (density) { "compact" -> 10.dp; "spacious" -> 19.dp; else -> 14.dp })) {
                Header(lang, main, muted, panel, border) { tab = 3 }
                when (page) {
                    0 -> {
                        Text(tr(lang, "tagline"), color = muted, fontSize = 9.sp, letterSpacing = 1.8.sp,
                            fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 5.dp, bottom = 1.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(7.dp), modifier = Modifier.padding(bottom = 5.dp)) {
                            Text(tr(lang, "hero"), color = main, fontSize = 33.sp * fontScale, lineHeight = 38.sp * fontScale,
                                fontWeight = FontWeight.SemiBold, letterSpacing = (-1.7).sp)
                            Text(tr(lang, "heroBody"), color = muted, fontSize = 13.sp * fontScale, lineHeight = 19.sp * fontScale)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                            StatCard(captures.size.toString(), tr(lang, "inbox"), panel, border, main, muted, Modifier.weight(1f))
                            StatCard(captures.count { it.pinned }.toString(), tr(lang, "pinned"), panel, border, main, muted, Modifier.weight(1f))
                            StatCard(captures.count { it.text.startsWith("http", true) }.toString(), tr(lang, "links"), panel, border, main, muted, Modifier.weight(1f))
                        }
                        SectionTitle(tr(lang, "quickCapture"), main)
                        Card(colors = CardDefaults.cardColors(containerColor = panel.copy(alpha = .94f)), shape = RoundedCornerShape(26.dp),
                            border = BorderStroke(1.dp, border.copy(alpha = .82f)), elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                            modifier = Modifier.fillMaxWidth().animateContentSize(spring(dampingRatio = .82f, stiffness = 320f))) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                                OutlinedTextField(value = draft, onValueChange = { draft = it.take(MAX_CAPTURE_CHARS) }, modifier = Modifier.fillMaxWidth(),
                                    placeholder = { Text(tr(lang, "placeholder"), color = muted, fontSize = 13.sp * fontScale) },
                                    textStyle = TextStyle(color = main, fontSize = 14.sp * fontScale, lineHeight = 20.sp * fontScale),
                                    minLines = 3, maxLines = 7, shape = RoundedCornerShape(18.dp), colors = fieldColors(bg, border, main, muted))
                                Button(onClick = {
                                    val text = draft.trim().take(MAX_CAPTURE_CHARS)
                                    if (text.isNotBlank()) {
                                        val now = System.currentTimeMillis()
                                        val editing = editingId
                                        if (editing == null) commit(listOf(Capture(UUID.randomUUID().toString(), text, now, now)) + captures)
                                        else commit(captures.map { if (it.id == editing) it.copy(text = text, updatedAt = now) else it })
                                        draft = ""; editingId = null; message = tr(lang, "saved")
                                    }
                                }, enabled = draft.isNotBlank(), modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                                    Icon(Icons.Outlined.Add, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp))
                                    Text(tr(lang, "save"), fontSize = 13.sp * fontScale, fontWeight = FontWeight.SemiBold)
                                }
                                if (editingId != null) TextButton(onClick = { draft = ""; editingId = null; message = "" }, modifier = Modifier.align(Alignment.End)) {
                                    Text(tr(lang, "cancel"), color = muted, fontSize = 11.sp)
                                }
                                AnimatedVisibility(
                                    visible = message.isNotBlank() && page == 0,
                                    enter = fadeIn(spring(dampingRatio = .88f, stiffness = 360f)) + slideInVertically { it / 5 },
                                    exit = fadeOut(spring(stiffness = 420f)) + slideOutVertically { it / 8 }
                                ) { InlineNotice(message, panel, border, main, muted, fontScale) }
                            }
                        }
                        if (resurfaced != null) {
                            SectionTitle(tr(lang, "rememberTitle"), main)
                            Text(tr(lang, "rememberBody"), color = muted, fontSize = 11.sp, lineHeight = 16.sp)
                            CaptureCard(resurfaced, lang, panel, raised, border, main, muted, fontScale, density, animations,
                                onPin = { item -> commit(captures.map { if (it.id == item.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it }) },
                                onCopy = { copy(it.text); message = tr(lang, "copied") },
                                onOpen = { open(it.text) },
                                onEdit = { draft = it.text; editingId = it.id; tab = 0; message = tr(lang, "edit") },
                                onDelete = { deleting = it },
                                onPreviewLoaded = { item, preview -> commit(captures.map { c -> if (c.id == item.id) c.copy(previewTitle = preview.title, previewDescription = preview.description, previewImageUrl = preview.imageUrl) else c }) })
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            SectionTitle(tr(lang, "recent"), main, Modifier.weight(1f))
                            TextButton(onClick = { tab = 1 }) { Text(tr(lang, "seeAll"), color = muted, fontSize = 11.sp) }
                        }
                        if (captures.isEmpty()) EmptyState(lang, panel, border, main, muted)
                        else captures.take(3).forEach { c -> CaptureCard(c, lang, panel, raised, border, main, muted, fontScale, density, animations,
                            onPin = { item -> commit(captures.map { if (it.id == item.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it }) },
                            onCopy = { copy(it.text); message = tr(lang, "copied") }, onOpen = { open(it.text) },
                            onEdit = { draft = it.text; editingId = it.id; tab = 0; message = tr(lang, "edit") },
                            onDelete = { deleting = it },
                            onPreviewLoaded = { item, preview -> commit(captures.map { c -> if (c.id == item.id) c.copy(previewTitle = preview.title, previewDescription = preview.description, previewImageUrl = preview.imageUrl) else c }) })
                        }
                        PrivacyCard(lang, panel, border, main, muted)
                    }
                    1, 2 -> {
                        Text(tr(lang, if (page == 1) "yourInbox" else "search"), color = main, fontSize = 28.sp * fontScale,
                            lineHeight = 33.sp * fontScale, fontWeight = FontWeight.Medium, letterSpacing = (-1).sp)
                        if (page == 1) Text(tr(lang, "privacyBody"), color = muted, fontSize = 12.sp * fontScale, lineHeight = 18.sp * fontScale)
                        else OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                            leadingIcon = { Icon(Icons.Outlined.Search, null, tint = muted) },
                            placeholder = { Text(tr(lang, "searchHint"), color = muted, fontSize = 12.sp * fontScale) },
                            textStyle = TextStyle(color = main, fontSize = 13.sp * fontScale), shape = RoundedCornerShape(18.dp),
                            colors = fieldColors(panel, border, main, muted))
                        FilterRow(lang, filter, { filter = it })
                        Text("${visible.size} ${tr(lang, "items")}", color = muted, fontSize = 11.sp)
                        if (visible.isEmpty()) EmptyState(lang, panel, border, main, muted, if (page == 2 && query.isNotBlank()) "noResults" else "empty")
                        else visible.take(visibleLimit).forEach { c -> CaptureCard(c, lang, panel, raised, border, main, muted, fontScale, density, animations,
                            onPin = { item -> commit(captures.map { if (it.id == item.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it }) },
                            onCopy = { copy(it.text); message = tr(lang, "copied") }, onOpen = { open(it.text) },
                            onEdit = { draft = it.text; editingId = it.id; tab = 0; message = tr(lang, "edit") },
                            onDelete = { deleting = it },
                            onPreviewLoaded = { item, preview -> commit(captures.map { c -> if (c.id == item.id) c.copy(previewTitle = preview.title, previewDescription = preview.description, previewImageUrl = preview.imageUrl) else c }) })
                        }
                        if (visible.size > visibleLimit) {
                            TextButton(onClick = { visibleLimit = (visibleLimit + 30).coerceAtMost(visible.size) }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                                Text(tr(lang, "loadMore"), color = muted, fontSize = 12.sp)
                            }
                        }
                    }
                    else -> {
                        Text(tr(lang, "settings"), color = main, fontSize = 28.sp * fontScale, fontWeight = FontWeight.Medium, letterSpacing = (-1).sp)
                        Text(tr(lang, "manage"), color = muted, fontSize = 12.sp * fontScale)
                        SettingsGroup(tr(lang, "appearance"), panel, border, main) {
                            Text(tr(lang, "appearance"), color = main, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                listOf("dark" to tr(lang, "themeDark"), "oled" to "OLED Black", "light" to tr(lang, "themeLight"), "system" to tr(lang, "themeSystem")).forEach { (v, label) ->
                                    FilterChip(selected = theme == v, onClick = { setTheme(v) }, label = { Text(label, fontSize = 11.sp) })
                                }
                            }
                            Text(if (lang == "ru") "Акцентный цвет" else if (lang == "az") "Vurğu rəngi" else if (lang == "tr") "Vurgu rengi" else "Accent color", color = muted, fontSize = 11.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("violet" to "Violet", "blue" to "Blue", "mint" to "Mint", "rose" to "Rose").forEach { (v, label) ->
                                    FilterChip(selected = accent == v, onClick = { setAccent(v) }, label = { Text(label, fontSize = 10.sp) })
                                }
                            }
                            SettingLine(Icons.Outlined.Language, tr(lang, "language"), languages.first { it.first == lang }.second, main, muted) { languageDialog = true }
                            SettingSwitch(tr(lang, "animations"), animations, setAnimations, main, muted)
                            SettingSwitch(tr(lang, "ambientAudio"), ambientAudio, setAmbientAudio, main, muted)
                            Text(if (lang == "ru") "Интенсивность эффектов" else if (lang == "az") "Effektlərin intensivliyi" else if (lang == "tr") "Efekt yoğunluğu" else "Visual effects", color = muted, fontSize = 11.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("quiet" to (if (lang == "ru") "Тихо" else if (lang == "az") "Sakit" else if (lang == "tr") "Sakin" else "Quiet"), "balanced" to (if (lang == "ru") "Баланс" else if (lang == "az") "Balans" else if (lang == "tr") "Dengeli" else "Balanced"), "atmosphere" to (if (lang == "ru") "Атмосфера" else if (lang == "az") "Atmosfer" else if (lang == "tr") "Atmosfer" else "Atmosphere")).forEach { (v, label) ->
                                    FilterChip(selected = effects == v, onClick = { setEffects(v) }, label = { Text(label, fontSize = 10.sp) })
                                }
                            }
                            Text(if (lang == "ru") "Плотность интерфейса" else if (lang == "az") "İnterfeys sıxlığı" else if (lang == "tr") "Arayüz yoğunluğu" else "Interface density", color = muted, fontSize = 11.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("compact" to (if (lang == "ru") "Компактно" else if (lang == "az") "Yığcam" else if (lang == "tr") "Kompakt" else "Compact"), "standard" to (if (lang == "ru") "Стандарт" else if (lang == "az") "Standart" else if (lang == "tr") "Standart" else "Standard"), "spacious" to (if (lang == "ru") "Свободно" else if (lang == "az") "Geniş" else if (lang == "tr") "Geniş" else "Spacious")).forEach { (v, label) ->
                                    FilterChip(selected = density == v, onClick = { setDensity(v) }, label = { Text(label, fontSize = 10.sp) })
                                }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(tr(lang, "fontSize"), color = main, fontSize = 12.sp, modifier = Modifier.weight(1f))
                                Text("${(fontScale * 100).toInt()}%", color = muted, fontSize = 11.sp)
                            }
                            Slider(value = fontScale, onValueChange = setFontScale, valueRange = .9f..1.2f, steps = 5)
                        }
                        SettingsGroup(tr(lang, "updates"), panel, border, main) {
                            SettingSwitch(tr(lang, "updateAlerts"), alerts, setAlerts, main, muted, tr(lang, "updateAlertsBody"))
                            if (alerts && !notificationPermissionGranted) {
                                Text(tr(lang, "notificationsBlocked"), color = Color(0xFFDA6969), fontSize = 11.sp, lineHeight = 16.sp)
                                TextButton(onClick = openNotificationSettings, modifier = Modifier.align(Alignment.Start)) {
                                    Text(tr(lang, "notificationSettings"), color = main, fontSize = 11.sp)
                                }
                            } else if (alerts) {
                                Text(tr(lang, "notificationsEnabled"), color = muted, fontSize = 10.sp)
                            }
                            TextButton(onClick = sendTestNotification, modifier = Modifier.align(Alignment.Start)) {
                                Text(tr(lang, "testNotification"), color = main, fontSize = 11.sp)
                            }
                            SettingSwitch(tr(lang, "autoDownload"), autoDownload, setAutoDownload, main, muted, tr(lang, "autoDownloadBody"))
                            Button(onClick = checkUpdates, enabled = !checking, modifier = Modifier.fillMaxWidth().height(46.dp),
                                shape = RoundedCornerShape(13.dp), colors = ButtonDefaults.buttonColors(containerColor = raised, contentColor = main)) {
                                Icon(Icons.Outlined.SystemUpdate, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(8.dp))
                                Text(if (checking) tr(lang, "checking") else tr(lang, "checkUpdates"), fontSize = 12.sp)
                            }
                            AnimatedVisibility(updateStatus.isNotBlank()) { Text(tr(lang, updateStatus), color = muted, fontSize = 11.sp, lineHeight = 16.sp) }
                            if (updateInfo != null) {
                                Card(colors = CardDefaults.cardColors(containerColor = raised), shape = RoundedCornerShape(14.dp)) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("${tr(lang, "available")}: ${updateInfo.version}", color = main, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                                        Text(tr(lang, "updateBody"), color = muted, fontSize = 11.sp, lineHeight = 16.sp)
                                        if (downloadingUpdate) {
                                            Text(tr(lang, "downloadProgress"), color = muted, fontSize = 11.sp)
                                            androidx.compose.material3.LinearProgressIndicator(progress = { downloadProgress / 100f }, modifier = Modifier.fillMaxWidth(), color = main, trackColor = border)
                                            Text("$downloadProgress%", color = muted, fontSize = 10.sp)
                                        }
                                        if (downloadFailed) Text(downloadFailureReason.ifBlank { tr(lang, "downloadFailed") }, color = Color(0xFFDA6969), fontSize = 11.sp)
                                        if (downloaded) {
                                            Text(tr(lang, "downloaded"), color = main, fontSize = 11.sp)
                                            Button(onClick = applyUpdate, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                                                Text(tr(lang, "applyUpdate"), fontSize = 12.sp)
                                            }
                                        } else {
                                            Button(onClick = { if (downloadFailed) retryDownload() else openUpdate(updateInfo) }, enabled = !downloadingUpdate, modifier = Modifier.fillMaxWidth(),
                                                shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                                                Text(if (downloadFailed) tr(lang, "updateNow") else if (downloadingUpdate) tr(lang, "downloadWaiting") else tr(lang, "updateNow"), fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            }
                            Text("${tr(lang, "version")}: $version", color = muted, fontSize = 10.sp)
                        }
                        SettingsGroup(tr(lang, "cloudSync"), panel, border, main) {
                            SettingLine(Icons.Outlined.Sync, tr(lang, "cloudSync"), tr(lang, "syncOpen"), main, muted) { cloudDialog = true }
                            Text(tr(lang, "cloudSyncBody"), color = muted, fontSize = 11.sp, lineHeight = 16.sp)
                            if (cloudStatus.isNotBlank()) Text("${tr(lang, "syncLatest")}: $cloudStatus", color = muted, fontSize = 10.sp, lineHeight = 15.sp)
                        }
                        SettingsGroup(tr(lang, "data"), panel, border, main) {
                            SettingLine(Icons.Outlined.ContentCopy, tr(lang, "export"), "", main, muted) {
                                val array = JSONArray()
                                captures.forEach { c -> array.put(JSONObject().put("id", c.id).put("text", c.text).put("createdAt", c.createdAt).put("updatedAt", c.updatedAt).put("pinned", c.pinned)
                                    .put("previewTitle", c.previewTitle).put("previewDescription", c.previewDescription).put("previewImageUrl", c.previewImageUrl)) }
                                val send = Intent(Intent.ACTION_SEND).apply { type = "application/json"; putExtra(Intent.EXTRA_SUBJECT, "Linka backup"); putExtra(Intent.EXTRA_TEXT, array.toString(2)) }
                                context.startActivity(Intent.createChooser(send, tr(lang, "export")))
                            }
                            SettingLine(Icons.Outlined.Inbox, tr(lang, "import"), "", main, muted) { importLauncher.launch(arrayOf("application/json", "text/*", "application/octet-stream")) }
                            AnimatedVisibility(
                                visible = message.isNotBlank() && page == 3,
                                enter = fadeIn(spring(dampingRatio = .88f, stiffness = 360f)) + slideInVertically { it / 5 },
                                exit = fadeOut(spring(stiffness = 420f)) + slideOutVertically { it / 8 }
                            ) { InlineNotice(message, panel, border, main, muted, fontScale) }
                            SettingLine(Icons.Outlined.DeleteOutline, tr(lang, "clearData"), "", Color(0xFFDA6969), muted) { clearDialog = true }
                        }
                        SettingsGroup(tr(lang, "agreement"), panel, border, main) {
                            SettingLine(Icons.Outlined.Check, tr(lang, "readAgreement"), "", main, muted) { agreementDialog = true }
                            Text(tr(lang, "localOnly"), color = muted, fontSize = 11.sp, lineHeight = 17.sp)
                        }
                        PrivacyCard(lang, panel, border, main, muted)
                        Text("Linka · $version", color = muted, fontSize = 10.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
                    }
                }
            }
        }
    }

    if (accepted && updateInfo != null && !updatePromptDismissed) {
        AlertDialog(
            onDismissRequest = { updatePromptDismissed = true },
            containerColor = panel,
            shape = RoundedCornerShape(24.dp),
            title = {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(tr(lang, "available"), color = main, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    Text("Linka ${updateInfo.version}", color = muted, fontSize = 12.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(tr(lang, "updateBody"), color = muted, fontSize = 13.sp, lineHeight = 19.sp)
                    Text(tr(lang, "updateChanges"), color = main, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text(localizeUpdateNotes(updateInfo.changes, lang), color = muted, fontSize = 12.sp, lineHeight = 18.sp)
                }
            },
            confirmButton = {
                Button(onClick = { updatePromptDismissed = true; openUpdate(updateInfo) },
                    shape = RoundedCornerShape(13.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                    Text(tr(lang, "updateNow"), fontSize = 12.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { updatePromptDismissed = true }) {
                    Text(tr(lang, "later"), color = muted, fontSize = 12.sp)
                }
            }
        )
    }
    if (cloudDialog) AlertDialog(
        onDismissRequest = { if (!cloudBusy) cloudDialog = false },
        containerColor = panel,
        shape = RoundedCornerShape(22.dp),
        title = { Text(tr(lang, "cloudSync"), color = main, fontWeight = FontWeight.SemiBold) },
        text = {
            Column(Modifier.heightIn(max = 470.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(tr(lang, "syncHelp"), color = muted, fontSize = 12.sp, lineHeight = 18.sp)
                TextButton(onClick = { cloudConfigExpanded = !cloudConfigExpanded }) {
                    Text(tr(lang, "syncConfig"), color = muted, fontSize = 10.sp)
                }
                if (cloudConfigExpanded || cloudUrl.isBlank() || cloudAnonKey.isBlank()) {
                    Text(tr(lang, "syncSetupHint"), color = muted, fontSize = 10.sp, lineHeight = 15.sp)
                    OutlinedTextField(value = cloudUrl, onValueChange = { cloudUrl = it }, label = { Text(tr(lang, "syncEndpoint")) },
                        singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                        textStyle = TextStyle(color = main, fontSize = 12.sp), colors = fieldColors(bg, border, main, muted))
                    OutlinedTextField(value = cloudAnonKey, onValueChange = { cloudAnonKey = it }, label = { Text(tr(lang, "syncAnonKey")) },
                        singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                        textStyle = TextStyle(color = main, fontSize = 12.sp), colors = fieldColors(bg, border, main, muted))
                    TextButton(onClick = {
                        copy(CLOUD_SYNC_SETUP_SQL)
                        cloudStatus = tr(lang, "syncCopied")
                    }, modifier = Modifier.align(Alignment.Start)) {
                        Text(tr(lang, "syncSetupSql"), color = muted, fontSize = 10.sp)
                    }
                }
                if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isBlank()) {
                    Button(
                        enabled = !cloudBusy,
                        onClick = {
                            val redirect = "linka://auth/callback"
                            val authorize = Uri.parse("${cloudUrl.trim().trimEnd('/')}/auth/v1/authorize")
                                .buildUpon()
                                .appendQueryParameter("provider", "google")
                                .appendQueryParameter("redirect_to", redirect)
                                .build().toString()
                            prefs.edit().putString(SYNC_URL_KEY, cloudUrl.trim().trimEnd('/'))
                                .putString(SYNC_ANON_KEY, cloudAnonKey.trim()).apply()
                            open(authorize)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)
                    ) { Text("Continue with Google", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                }
                if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isBlank()) {
                    val emailSignInLabel = when (lang) {
                        "ru" -> if (emailSignInExpanded) "Скрыть вход по почте" else "Другой способ: код из почты"
                        "az" -> if (emailSignInExpanded) "E-poçt girişini gizlət" else "E-poçt kodu ilə giriş"
                        "tr" -> if (emailSignInExpanded) "E-posta girişini gizle" else "E-posta koduyla giriş"
                        else -> if (emailSignInExpanded) "Hide email sign-in" else "Use email code instead"
                    }
                    TextButton(onClick = { emailSignInExpanded = !emailSignInExpanded },
                        modifier = Modifier.fillMaxWidth()) {
                        Text(emailSignInLabel, color = muted, fontSize = 11.sp)
                    }
                    if (emailSignInExpanded) {
                        OutlinedTextField(value = cloudEmail, onValueChange = { cloudEmail = it }, label = { Text(tr(lang, "syncEmail")) },
                            singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                            textStyle = TextStyle(color = main, fontSize = 12.sp), colors = fieldColors(bg, border, main, muted))
                        if (otpRequested) {
                            OutlinedTextField(value = cloudOtp, onValueChange = { cloudOtp = it.filter(Char::isDigit).take(6) },
                                label = { Text(tr(lang, "syncPassword")) }, singleLine = true,
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                                textStyle = TextStyle(color = main, fontSize = 16.sp, letterSpacing = 4.sp),
                                colors = fieldColors(bg, border, main, muted))
                            Text(tr(lang, "syncWait") + " ${otpCooldownSeconds}s · " + tr(lang, "syncOtpExpired") + " ${otpRemainingSeconds}s",
                                color = muted, fontSize = 10.sp, lineHeight = 15.sp)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.fillMaxWidth()) {
                            TextButton(enabled = !cloudBusy && otpCooldownSeconds <= 0,
                                onClick = { requestEmailCode(false) }, modifier = Modifier.weight(1f)) {
                                Text(if (otpCooldownSeconds > 0) "${tr(lang, "syncSendCode")} · ${otpCooldownSeconds}s" else tr(lang, "syncSendCode"),
                                    color = main, fontSize = 10.sp)
                            }
                            TextButton(enabled = !cloudBusy && otpCooldownSeconds <= 0,
                                onClick = { requestEmailCode(true) }, modifier = Modifier.weight(1f)) {
                                Text(if (otpCooldownSeconds > 0) "${tr(lang, "syncRegisterCode")} · ${otpCooldownSeconds}s" else tr(lang, "syncRegisterCode"),
                                    color = main, fontSize = 10.sp)
                            }
                        }
                    }
                }
                if (cloudStatus.isNotBlank()) Text(cloudStatus, color = main, fontSize = 11.sp, lineHeight = 16.sp)
                if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isNotBlank()) {
                    TextButton(onClick = {
                        prefs.edit().remove(SYNC_REFRESH_KEY).apply()
                        cloudStatus = tr(lang, "syncRequired")
                    }, modifier = Modifier.align(Alignment.Start)) {
                        Text(tr(lang, "syncForget"), color = Color(0xFFDA6969), fontSize = 11.sp)
                    }
                }
            }
        },
        confirmButton = {
            Button(enabled = !cloudBusy, onClick = {
                cloudBusy = true
                prefs.edit().putString(SYNC_URL_KEY, cloudUrl.trim().trimEnd('/'))
                    .putString(SYNC_ANON_KEY, cloudAnonKey.trim()).putString(SYNC_EMAIL_KEY, cloudEmail.trim()).apply()
                scope.launch {
                    try {
                        val stored = prefs.getString(SYNC_REFRESH_KEY, "").orEmpty()
                        if (stored.isBlank() && !otpRequested) {
                            cloudStatus = tr(lang, "syncNeedCode")
                            return@launch
                        }
                        if (stored.isBlank() && otpRemainingSeconds <= 0) {
                            cloudStatus = tr(lang, "syncOtpExpired")
                            return@launch
                        }
                        val rawDeleted = JSONArray(prefs.getString(DELETED_IDS_KEY, "[]") ?: "[]")
                        val deletedIds = (0 until rawDeleted.length()).map { rawDeleted.optString(it) }.filter { it.isNotBlank() }.toSet()
                        val verifiedToken = if (stored.isBlank()) {
                            verifyEmailOtp(cloudUrl, cloudAnonKey, cloudEmail, cloudOtp).also {
                                prefs.edit().putString(SYNC_REFRESH_KEY, it).apply()
                            }
                        } else stored
                        val result = syncWithSupabase(cloudUrl, cloudAnonKey, cloudEmail, "", false, captures, deletedIds, verifiedToken, localProfileJson())
                        prefs.edit().putString(SYNC_REFRESH_KEY, result.encryptedRefreshToken)
                            .putString(DELETED_IDS_KEY, JSONArray().apply { result.deletedIds.forEach { put(it) } }.toString())
                            .putString(SYNC_STATUS_KEY, result.message).apply()
                        captures = result.captures
                        save(result.captures)
                        keepSyncedProfile(result.profile)
                        cloudStatus = result.message
                        cloudPassword = ""
                        cloudOtp = ""
                        otpRequested = false
                        if (stored.isBlank()) cloudDialog = false
                        prefs.edit().remove("otp_expires_at").apply()
                        if (stored.isBlank() && localProfileJson()?.optString("displayName").isNullOrBlank() && result.profile?.optString("displayName").isNullOrBlank()) {
                            profileDialog = true
                            cloudDialog = false
                        }
                    } catch (e: Exception) {
                        cloudStatus = e.message ?: "Cloud sync failed"
                    } finally {
                        cloudBusy = false
                    }
                }
            }, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                Text(if (cloudBusy) tr(lang, "syncWorking") else if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isBlank()) tr(lang, "syncVerifyAndSync") else tr(lang, "syncNow"), fontSize = 11.sp)
            }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isBlank()) TextButton(enabled = !cloudBusy, onClick = {
                    requestEmailCode(true)
                }) { Text(tr(lang, "syncRegisterCode"), color = main, fontSize = 10.sp) }
                TextButton(enabled = !cloudBusy, onClick = { cloudDialog = false }) { Text(tr(lang, "syncOffline"), color = muted, fontSize = 10.sp) }
                TextButton(enabled = !cloudBusy, onClick = { cloudDialog = false }) { Text(tr(lang, "syncClose"), color = muted, fontSize = 10.sp) }
            }
        }
    )
    if (profileDialog) AlertDialog(
        onDismissRequest = { profileDialog = false },
        containerColor = panel,
        shape = RoundedCornerShape(22.dp),
        title = { Text(tr(lang, "profileTitle"), color = main, fontWeight = FontWeight.SemiBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(tr(lang, "profilePrompt"), color = muted, fontSize = 12.sp, lineHeight = 18.sp)
                OutlinedTextField(value = profileName, onValueChange = { profileName = it.take(48) },
                    label = { Text(tr(lang, "profileName")) }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                    textStyle = TextStyle(color = main, fontSize = 13.sp), colors = fieldColors(bg, border, main, muted))
                OutlinedTextField(value = profileAge, onValueChange = { profileAge = it.filter(Char::isDigit).take(3) },
                    label = { Text(tr(lang, "profileAge")) }, singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                    textStyle = TextStyle(color = main, fontSize = 13.sp), colors = fieldColors(bg, border, main, muted))
            }
        },
        confirmButton = {
            Button(onClick = {
                val name = profileName.trim().replace(Regex("\\s+"), " ").take(48)
                val ageValue = profileAge.trim().takeIf { it.isNotBlank() }?.toIntOrNull()
                if (name.isBlank()) {
                    message = tr(lang, "profileName")
                } else if (profileAge.isNotBlank() && (ageValue == null || ageValue !in 13..120)) {
                    message = tr(lang, "profileAge")
                } else {
                    val profile = JSONObject().put("displayName", name)
                        .put("age", ageValue ?: JSONObject.NULL)
                        .put("updatedAt", System.currentTimeMillis())
                    prefs.edit().putString(PROFILE_JSON_KEY, profile.toString()).apply()
                    profileName = name
                    profileDialog = false
                    if (prefs.getString(SYNC_REFRESH_KEY, "").orEmpty().isNotBlank() && cloudUrl.isNotBlank() && cloudAnonKey.isNotBlank()) {
                        scope.launch {
                            runCatching {
                                val rawDeleted = JSONArray(prefs.getString(DELETED_IDS_KEY, "[]") ?: "[]")
                                val deleted = (0 until rawDeleted.length()).map { rawDeleted.optString(it) }.filter { it.isNotBlank() }.toSet()
                                val result = syncWithSupabase(cloudUrl, cloudAnonKey, cloudEmail, "", false, captures, deleted,
                                    prefs.getString(SYNC_REFRESH_KEY, "").orEmpty(), localProfileJson())
                                prefs.edit().putString(SYNC_REFRESH_KEY, result.encryptedRefreshToken).apply()
                                keepSyncedProfile(result.profile)
                                captures = result.captures
                                save(result.captures)
                                message = result.message
                            }.onFailure { message = it.message ?: tr(lang, "failed") }
                        }
                    }
                }
            }, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                Text(tr(lang, "profileSave"), fontSize = 11.sp)
            }
        },
        dismissButton = {
            TextButton(onClick = {
                profileDialog = false
                if (profileName.isBlank()) profileName = "Linka user"
                val profile = JSONObject().put("displayName", profileName).put("age", JSONObject.NULL).put("updatedAt", System.currentTimeMillis())
                prefs.edit().putString(PROFILE_JSON_KEY, profile.toString()).apply()
            }) { Text(tr(lang, "syncClose"), color = muted, fontSize = 11.sp) }
        }
    )
    if (!accepted || agreementDialog) AgreementDialog(lang, panel, border, main, muted, !accepted,
        onAgree = agree, onDecline = decline, onClose = { agreementDialog = false })
    if (languageDialog) AlertDialog(onDismissRequest = { languageDialog = false }, containerColor = panel,
        title = { Text(tr(lang, "language"), color = main) },
        text = { Column { languages.forEach { (code, label) ->
            Row(Modifier.fillMaxWidth().clickable { setLanguage(code); languageDialog = false }.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = lang == code, onClick = { setLanguage(code); languageDialog = false })
                Text(label, color = main, fontSize = 13.sp)
            }
        } } }, confirmButton = { TextButton(onClick = { languageDialog = false }) { Text(tr(lang, "done"), color = main) } })
    if (deleting != null) AlertDialog(onDismissRequest = { deleting = null }, containerColor = panel,
        title = { Text(tr(lang, "delete"), color = main) }, text = { Text(deleting!!.text.take(180), color = muted) },
        confirmButton = { TextButton(onClick = { commit(captures.filterNot { it.id == deleting!!.id }); deleting = null; message = tr(lang, "deleted") }) { Text(tr(lang, "delete"), color = Color(0xFFDA6969)) } },
        dismissButton = { TextButton(onClick = { deleting = null }) { Text(tr(lang, "cancel"), color = muted) } })
    if (clearDialog) AlertDialog(onDismissRequest = { clearDialog = false }, containerColor = panel,
        title = { Text(tr(lang, "clearData"), color = main) }, text = { Text(tr(lang, "clearConfirm"), color = muted, fontSize = 13.sp, lineHeight = 19.sp) },
        confirmButton = { TextButton(onClick = { commit(emptyList()); clearDialog = false; message = ""; query = "" }) { Text(tr(lang, "deleteAll"), color = Color(0xFFDA6969)) } },
        dismissButton = { TextButton(onClick = { clearDialog = false }) { Text(tr(lang, "cancel"), color = muted) } })
}

@Composable
private fun LanguageWelcome(dark: Boolean, animations: Boolean, onContinue: (String) -> Unit) {
    val bg = if (dark) DB else LB; val panel = if (dark) DS else LS; val main = if (dark) DT else LT; val muted = if (dark) DM else LM; val border = if (dark) DBR else LBR
    var chosen by remember { mutableStateOf("az") }
    Column(Modifier.fillMaxSize().background(bg).padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.Start) {
        Surface(shape = RoundedCornerShape(20.dp), color = panel, border = BorderStroke(1.dp, border)) {
            androidx.compose.foundation.Image(painterResource(R.drawable.linka_mark), "Linka", Modifier.size(62.dp).padding(8.dp))
        }
        Spacer(Modifier.height(25.dp))
        Text("linka", color = main, fontSize = 38.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-2).sp)
        Text(tr(chosen, "languageIntro"), color = main, fontSize = 22.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 15.dp))
        Text(tr(chosen, "languageBody"), color = muted, fontSize = 13.sp, modifier = Modifier.padding(top = 5.dp, bottom = 17.dp))
        languages.forEach { (code, label) ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { chosen = code }.animateContentSize(spring()),
                colors = CardDefaults.cardColors(containerColor = if (chosen == code) panel else bg),
                shape = RoundedCornerShape(15.dp), border = BorderStroke(1.dp, if (chosen == code) main.copy(alpha = .55f) else border)) {
                Row(Modifier.padding(horizontal = 15.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = chosen == code, onClick = { chosen = code })
                    Text(label, color = main, fontSize = 14.sp, modifier = Modifier.weight(1f))
                    if (chosen == code) Icon(Icons.Outlined.Check, null, tint = main, modifier = Modifier.size(18.dp))
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        Button(onClick = { onContinue(chosen) }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(15.dp),
            colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
            Text(tr(chosen, "continue"), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun Header(lang: String, main: Color, muted: Color, panel: Color, border: Color, onSettings: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Surface(shape = RoundedCornerShape(16.dp), color = panel.copy(alpha = .96f), border = BorderStroke(1.dp, border)) {
            androidx.compose.foundation.Image(painterResource(R.drawable.linka_mark), "Linka logo", Modifier.size(47.dp).padding(4.dp))
        }
        Column {
            Text("linka", color = main, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.4).sp)
            Text(tr(lang, "tagline"), color = muted, fontSize = 8.sp, letterSpacing = 1.2.sp)
        }
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSettings) { Icon(Icons.Outlined.Tune, tr(lang, "settings"), tint = muted) }
    }
}

@Composable
private fun StatCard(value: String, label: String, panel: Color, border: Color, main: Color, muted: Color, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = panel.copy(alpha = .96f)), border = BorderStroke(1.dp, border.copy(alpha = .82f)), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(value, color = main, fontSize = 23.sp, fontWeight = FontWeight.Medium, letterSpacing = (-1).sp)
            Text(label, color = muted, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
@Composable
private fun InlineNotice(message: String, panel: Color, border: Color, main: Color, muted: Color, scale: Float) {
    Card(
        colors = CardDefaults.cardColors(containerColor = panel),
        border = BorderStroke(1.dp, border),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(9.dp)
        ) {
            Surface(color = main.copy(alpha = .08f), shape = CircleShape) {
                Icon(Icons.Outlined.Check, null, tint = main, modifier = Modifier.padding(6.dp).size(15.dp))
            }
            Text(message, color = main, fontSize = 11.sp * scale, lineHeight = 16.sp, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun SectionTitle(title: String, main: Color, modifier: Modifier = Modifier) {
    Text(title, modifier = modifier, color = main, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
}
@Composable
private fun FilterRow(lang: String, selected: String, onSelected: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        listOf("all", "pinned", "links", "notes").forEach { key ->
            FilterChip(selected = selected == key, onClick = { onSelected(key) }, label = { Text(tr(lang, key), fontSize = 10.sp) })
        }
    }
}

@Composable
private fun CaptureCard(
    capture: Capture, lang: String, panel: Color, raised: Color, border: Color, main: Color, muted: Color, scale: Float, density: String, animations: Boolean,
    onPin: (Capture) -> Unit, onCopy: (Capture) -> Unit, onOpen: (Capture) -> Unit, onEdit: (Capture) -> Unit, onDelete: (Capture) -> Unit,
    onPreviewLoaded: (Capture, LinkPreview) -> Unit
) {
    val link = capture.text.startsWith("http://", true) || capture.text.startsWith("https://", true)
    var expanded by remember(capture.id) { mutableStateOf(false) }
    val hasExpandableContent = if (link) capture.previewDescription.length > 180 else capture.text.length > 220
    LaunchedEffect(capture.id, capture.text) {
        if (link && capture.previewTitle.isBlank() && capture.previewImageUrl.isBlank() && capture.previewDescription.isBlank()) {
            fetchLinkPreview(capture.text)?.let { onPreviewLoaded(capture, it) }
        }
    }
    Card(colors = CardDefaults.cardColors(containerColor = if (capture.pinned) raised else panel), border = BorderStroke(1.dp, border),
        elevation = CardDefaults.cardElevation(defaultElevation = if (capture.pinned) 2.dp else 1.dp),
        shape = RoundedCornerShape(23.dp), modifier = Modifier.fillMaxWidth().then(if (animations) Modifier.animateContentSize(spring(dampingRatio = .82f, stiffness = 320f)) else Modifier)) {
        Column(Modifier.padding(when (density) { "compact" -> 12.dp; "spacious" -> 21.dp; else -> 15.dp }), verticalArrangement = Arrangement.spacedBy(when (density) { "compact" -> 6.dp; "spacious" -> 13.dp; else -> 9.dp })) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(if (link) Icons.Outlined.Link else Icons.Outlined.NoteAlt, null, tint = muted, modifier = Modifier.size(16.dp))
                Text(if (capture.pinned) tr(lang, "pinned").uppercase() else tr(lang, captureTypeKey(capture)).uppercase(), color = muted, fontSize = 9.sp, letterSpacing = 1.sp)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { onPin(capture) }, modifier = Modifier.size(30.dp)) {
                    Icon(Icons.Outlined.PushPin, tr(lang, if (capture.pinned) "unpin" else "pin"), tint = if (capture.pinned) main else muted, modifier = Modifier.size(17.dp))
                }
            }
            if (link && capture.previewImageUrl.startsWith("https://", true)) {
                AsyncImage(
                    model = capture.previewImageUrl,
                    contentDescription = capture.previewTitle.ifBlank { "Link preview" },
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(13.dp))
                )
            }
            if (link) {
                val host = Uri.parse(capture.text).host.orEmpty().removePrefix("www.")
                Text(capture.previewTitle.ifBlank { host.ifBlank { capture.text } }, color = main,
                    fontSize = 14.sp * scale, lineHeight = 19.sp * scale, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (capture.previewDescription.isNotBlank()) Text(capture.previewDescription, color = muted,
                    fontSize = 11.sp * scale, lineHeight = 16.sp * scale, maxLines = if (expanded) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                Text(capture.text, color = muted, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            } else {
                Text(capture.text, color = main, fontSize = 13.sp * scale, lineHeight = 19.sp * scale,
                    maxLines = if (expanded) Int.MAX_VALUE else 8, overflow = TextOverflow.Ellipsis)
            }
            if (hasExpandableContent) {
                TextButton(onClick = { expanded = !expanded }, contentPadding = PaddingValues(horizontal = 2.dp, vertical = 0.dp)) {
                    Text(tr(lang, if (expanded) "showLess" else "readMore"), color = muted, fontSize = 10.sp)
                }
            }
            Text(DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT, Locale.getDefault()).format(Date(capture.updatedAt)), color = muted, fontSize = 9.sp)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                IconButton(onClick = { onCopy(capture) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.ContentCopy, tr(lang, "copy"), tint = muted, modifier = Modifier.size(16.dp)) }
                if (link) TextButton(onClick = { onOpen(capture) }, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)) { Text(tr(lang, "open"), color = muted, fontSize = 10.sp) }
                IconButton(onClick = { onEdit(capture) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.Edit, tr(lang, "edit"), tint = muted, modifier = Modifier.size(16.dp)) }
                IconButton(onClick = { onDelete(capture) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.DeleteOutline, tr(lang, "delete"), tint = muted, modifier = Modifier.size(16.dp)) }
            }
        }
    }
}
@Composable
private fun EmptyState(lang: String, panel: Color, border: Color, main: Color, muted: Color, titleKey: String = "empty") {
    Card(colors = CardDefaults.cardColors(containerColor = panel), border = BorderStroke(1.dp, border), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(23.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Surface(color = if (MaterialTheme.colorScheme.background == DB) DR else LR, shape = RoundedCornerShape(17.dp)) {
                Icon(Icons.Outlined.Inbox, null, tint = muted, modifier = Modifier.padding(12.dp).size(24.dp))
            }
            Text(tr(lang, titleKey), color = main, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Text(tr(lang, if (titleKey == "noResults") "emptySearch" else "emptyBody"), color = muted, fontSize = 11.sp, lineHeight = 17.sp)
        }
    }
}
@Composable
private fun PrivacyCard(lang: String, panel: Color, border: Color, main: Color, muted: Color) {
    Card(colors = CardDefaults.cardColors(containerColor = panel), border = BorderStroke(1.dp, border), shape = RoundedCornerShape(17.dp)) {
        Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(shape = RoundedCornerShape(11.dp), color = if (MaterialTheme.colorScheme.background == DB) DR else LR) {
                Icon(Icons.Outlined.Check, null, tint = muted, modifier = Modifier.padding(9.dp).size(18.dp))
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(tr(lang, "private"), color = main, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text(tr(lang, "privacyBody"), color = muted, fontSize = 10.sp, lineHeight = 15.sp)
            }
        }
    }
}
@Composable
private fun SettingsGroup(title: String, panel: Color, border: Color, main: Color, content: @Composable () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = panel.copy(alpha = .96f)), border = BorderStroke(1.dp, border.copy(alpha = .82f)), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            Text(title, color = main, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            content()
        }
    }
}
@Composable
private fun SettingLine(icon: ImageVector, title: String, detail: String, main: Color, muted: Color, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable { onClick() }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(icon, null, tint = muted, modifier = Modifier.size(19.dp))
        Text(title, color = main, fontSize = 12.sp, modifier = Modifier.weight(1f))
        if (detail.isNotBlank()) Text(detail, color = muted, fontSize = 10.sp, maxLines = 1)
        Icon(Icons.Outlined.ChevronRight, null, tint = muted, modifier = Modifier.size(16.dp))
    }
}
@Composable
private fun SettingSwitch(title: String, checked: Boolean, onChange: (Boolean) -> Unit, main: Color, muted: Color, subtitle: String = "") {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, color = main, fontSize = 12.sp, modifier = Modifier.weight(1f))
            Switch(checked = checked, onCheckedChange = onChange)
        }
        if (subtitle.isNotBlank()) Text(subtitle, color = muted, fontSize = 10.sp, lineHeight = 15.sp)
    }
}
@Composable
private fun AgreementDialog(lang: String, panel: Color, border: Color, main: Color, muted: Color, initial: Boolean, onAgree: () -> Unit, onDecline: () -> Unit, onClose: () -> Unit) {
    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!initial) onClose() },
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false, dismissOnBackPress = !initial, dismissOnClickOutside = !initial)) {
        Surface(Modifier.fillMaxWidth(.94f), shape = RoundedCornerShape(25.dp), color = panel, border = BorderStroke(1.dp, border), tonalElevation = 8.dp) {
            Column(Modifier.padding(19.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("linka", color = main, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1).sp)
                    Spacer(Modifier.weight(1f))
                    if (!initial) IconButton(onClick = onClose) { Icon(Icons.Outlined.Close, "Close", tint = muted) }
                }
                Text(tr(lang, if (initial) "beforeBegin" else "agreement"), color = main, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 5.dp))
                Text(tr(lang, "termsIntro"), color = muted, fontSize = 11.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 5.dp))
                Column(Modifier.height(280.dp).verticalScroll(rememberScrollState()).padding(top = 13.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    AgreementSection(tr(lang, "localStorage"), tr(lang, "localStorageBody"), main, muted)
                    AgreementSection(tr(lang, "noSync"), tr(lang, "noSyncBody"), main, muted)
                    AgreementSection(tr(lang, "responsibility"), tr(lang, "responsibilityBody"), main, muted)
                    AgreementSection(tr(lang, "external"), tr(lang, "externalBody"), main, muted)
                    AgreementSection(tr(lang, "lawful"), tr(lang, "lawfulBody"), main, muted)
                    Text(tr(lang, "legalNote"), color = muted, fontSize = 10.sp, lineHeight = 15.sp)
                }
                if (initial) {
                    Button(onClick = onAgree, colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = if (MaterialTheme.colorScheme.background == DB) DB else LB),
                        shape = RoundedCornerShape(13.dp), modifier = Modifier.fillMaxWidth().padding(top = 12.dp).height(48.dp)) { Text(tr(lang, "agree"), fontWeight = FontWeight.SemiBold, fontSize = 12.sp) }
                    TextButton(onClick = onDecline, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(tr(lang, "decline"), color = muted, fontSize = 11.sp) }
                } else Button(onClick = onClose, colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = if (MaterialTheme.colorScheme.background == DB) DB else LB),
                    shape = RoundedCornerShape(13.dp), modifier = Modifier.fillMaxWidth().padding(top = 12.dp).height(46.dp)) { Text(tr(lang, "done")) }
            }
        }
    }
}
@Composable
private fun AgreementSection(title: String, body: String, main: Color, muted: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, color = main, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(body, color = muted, fontSize = 10.sp, lineHeight = 15.sp)
    }
}
@Composable
private fun fieldColors(container: Color, border: Color, main: Color, muted: Color) = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = container, unfocusedContainerColor = container,
    focusedBorderColor = main.copy(alpha = .7f), unfocusedBorderColor = border,
    focusedTextColor = main, unfocusedTextColor = main, cursorColor = main,
    focusedPlaceholderColor = muted, unfocusedPlaceholderColor = muted
)
