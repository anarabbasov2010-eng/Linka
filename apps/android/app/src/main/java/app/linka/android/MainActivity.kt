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
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

private val DB = Color(0xFF09090B)
private val DS = Color(0xFF141417)
private val DR = Color(0xFF1D1D22)
private val DBR = Color(0xFF303036)
private val DT = Color(0xFFF5F5F7)
private val DM = Color(0xFF9898A2)
private val LB = Color(0xFFF4F4F6)
private val LS = Color(0xFFFFFFFF)
private val LR = Color(0xFFF0F0F4)
private val LBR = Color(0xFFE1E1E8)
private val LT = Color(0xFF19191E)
private val LM = Color(0xFF73737E)
private const val PREFS = "linka_local_v3"
private const val CAPTURES_KEY = "captures"
private const val THEME_KEY = "theme"
private const val LANGUAGE_KEY = "language"
private const val TERMS_KEY = "agreement_accepted"
private const val TERMS_VERSION = "2026-10-23-v2"
private const val ANIMATIONS_KEY = "animations"
private const val FONT_SCALE_KEY = "font_scale"
private const val UPDATE_ALERTS_KEY = "update_alerts"
private const val LAST_NOTIFIED_KEY = "last_notified_version"
private const val MAX_CAPTURE_CHARS = 100_000
private const val MAX_CAPTURES = 500
private const val RELEASES_API = "https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest"
private const val NOTIFICATION_CHANNEL = "linka_updates"

private data class Capture(val id: String, val text: String, val createdAt: Long, val updatedAt: Long = createdAt, val pinned: Boolean = false)
private data class UpdateInfo(val version: String, val downloadUrl: String, val releaseUrl: String)

private val languages = listOf("az" to "Azərbaycan dili", "en" to "English", "ru" to "Русский", "tr" to "Türkçe")
private val words = mapOf(
    "en" to mapOf(
        "tagline" to "YOUR PERSONAL SPACE", "home" to "Home", "inbox" to "Inbox", "search" to "Search", "settings" to "Settings",
        "hero" to "Keep what matters.", "heroBody" to "Links, thoughts and text. All in one calm place.",
        "quickCapture" to "Quick capture", "placeholder" to "Write a thought or paste a link…", "save" to "Save to inbox",
        "saved" to "Saved on this phone", "recent" to "Recently saved", "seeAll" to "See all", "yourInbox" to "Your inbox",
        "all" to "All", "pinned" to "Pinned", "links" to "Links", "notes" to "Notes", "items" to "items",
        "empty" to "Nothing here yet", "emptyBody" to "Save something above, or share text from another app to Linka.",
        "private" to "Private by default", "privacyBody" to "Stored on this device. Export a backup whenever you need it.",
        "appearance" to "Appearance", "language" to "App language", "animations" to "Smooth animations",
        "fontSize" to "Text size", "updateAlerts" to "Update notifications", "updateAlertsBody" to "Notify me when a newer Android version is released.",
        "updates" to "App updates", "checkUpdates" to "Check for updates", "checking" to "Checking…", "latest" to "You're up to date",
        "failed" to "Couldn't check for updates. Check your connection and try again.", "available" to "A newer Linka is ready",
        "updateBody" to "A new version is available. Download the APK and confirm installation when Android asks.",
        "updateNow" to "Download update", "later" to "Not now", "themeDark" to "Dark", "themeLight" to "Light", "themeSystem" to "System",
        "data" to "Your data", "export" to "Export backup", "import" to "Import backup", "clearData" to "Delete all captures",
        "clearConfirm" to "This permanently deletes all captures saved on this device. Export a backup first if you need one.",
        "deleteAll" to "Delete all", "cancel" to "Cancel", "done" to "Done", "agreement" to "User agreement",
        "readAgreement" to "Read user agreement", "beforeBegin" to "Before we begin", "termsIntro" to "A quick note about how Linka handles your data.",
        "agree" to "I agree and continue", "decline" to "Decline and close", "localStorage" to "1. Data on this device",
        "localStorageBody" to "Captures are stored locally on this phone. Clearing app storage, uninstalling the app or losing the device may erase them. Export backups that matter.",
        "noSync" to "2. No cloud sync yet", "noSyncBody" to "Accounts and automatic cross-device synchronization are not available in this version. Transfer data using manual export and import.",
        "responsibility" to "3. Your responsibility", "responsibilityBody" to "You are responsible for content you save, device security and backups. Do not use Linka as the only copy of critical information.",
        "external" to "4. External services and early access", "externalBody" to "External links open outside Linka. This early version may contain defects and is not guaranteed to be error-free.",
        "lawful" to "5. Lawful use", "lawfulBody" to "Use the app lawfully and respect other people's rights. Avoid saving sensitive information on a device other people can access.",
        "legalNote" to "This notice is not professional legal advice.", "noResults" to "No results", "searchHint" to "Search saved links and notes…",
        "copied" to "Copied to clipboard", "deleted" to "Capture deleted", "edit" to "Edit", "open" to "Open", "copy" to "Copy",
        "delete" to "Delete", "pin" to "Pin", "unpin" to "Unpin", "localOnly" to "Data stays on this phone. Automatic sync and accounts are not implemented yet.",
        "languageIntro" to "Choose your language", "languageBody" to "You can change this later in Settings.", "continue" to "Continue",
        "importSuccess" to "Backup imported", "importFailed" to "Couldn't read this backup file.", "emptySearch" to "Try another search or filter.",
        "version" to "Version", "manage" to "Personalize your Linka experience", "local" to "ON THIS DEVICE"
    ),
    "ru" to mapOf(
        "tagline" to "ТВОЁ ЛИЧНОЕ ПРОСТРАНСТВО", "home" to "Главная", "inbox" to "Сохранённое", "search" to "Поиск", "settings" to "Настройки",
        "hero" to "Сохраняй важное.", "heroBody" to "Ссылки, мысли и текст — в одном спокойном месте.",
        "quickCapture" to "Быстрое сохранение", "placeholder" to "Напиши мысль или вставь ссылку…", "save" to "Сохранить",
        "saved" to "Сохранено на устройстве", "recent" to "Недавно сохранено", "seeAll" to "Все", "yourInbox" to "Твои материалы",
        "all" to "Все", "pinned" to "Закреплённое", "links" to "Ссылки", "notes" to "Заметки", "items" to "шт.",
        "empty" to "Пока здесь пусто", "emptyBody" to "Сохрани запись выше или отправь текст в Linka из другого приложения.",
        "private" to "Приватность по умолчанию", "privacyBody" to "Данные хранятся на устройстве. При необходимости создай резервную копию.",
        "appearance" to "Внешний вид", "language" to "Язык приложения", "animations" to "Плавные анимации",
        "fontSize" to "Размер текста", "updateAlerts" to "Уведомления об обновлениях", "updateAlertsBody" to "Сообщать о новых версиях Linka для Android.",
        "updates" to "Обновления приложения", "checkUpdates" to "Проверить обновления", "checking" to "Проверяем…", "latest" to "У тебя актуальная версия",
        "failed" to "Не удалось проверить обновления. Проверь подключение и повтори попытку.", "available" to "Доступна новая версия Linka",
        "updateBody" to "Вышла новая версия. Скачай APK и подтверди установку, когда Android попросит.",
        "updateNow" to "Скачать обновление", "later" to "Позже", "themeDark" to "Тёмная", "themeLight" to "Светлая", "themeSystem" to "Как в системе",
        "data" to "Твои данные", "export" to "Экспортировать копию", "import" to "Импортировать копию", "clearData" to "Удалить все записи",
        "clearConfirm" to "Все записи на этом устройстве будут удалены без возможности отмены. Сначала экспортируй копию, если она нужна.",
        "deleteAll" to "Удалить всё", "cancel" to "Отмена", "done" to "Готово", "agreement" to "Пользовательское соглашение",
        "readAgreement" to "Прочитать соглашение", "beforeBegin" to "Перед началом", "termsIntro" to "Кратко о том, как Linka обращается с твоими данными.",
        "agree" to "Принимаю и продолжаю", "decline" to "Отказаться и закрыть", "localStorage" to "1. Данные на устройстве",
        "localStorageBody" to "Записи хранятся на этом телефоне. Очистка данных приложения, его удаление или потеря устройства могут привести к потере записей. Сохраняй резервные копии.",
        "noSync" to "2. Пока без облачной синхронизации", "noSyncBody" to "В этой версии нет аккаунтов и автоматической синхронизации между устройствами. Перенос данных доступен вручную через экспорт и импорт.",
        "responsibility" to "3. Твоя ответственность", "responsibilityBody" to "Ты отвечаешь за содержимое записей, безопасность устройства и резервные копии. Не храни здесь единственную копию важных данных.",
        "external" to "4. Внешние сервисы и ранняя версия", "externalBody" to "Внешние ссылки открываются вне Linka. В ранней версии возможны ошибки; бесперебойная работа не гарантируется.",
        "lawful" to "5. Законное использование", "lawfulBody" to "Используй приложение законно и уважай права других людей. Не сохраняй чувствительные данные на устройстве, к которому есть чужой доступ.",
        "legalNote" to "Этот текст не является профессиональной юридической консультацией.", "noResults" to "Ничего не найдено", "searchHint" to "Поиск по ссылкам и заметкам…",
        "copied" to "Скопировано", "deleted" to "Запись удалена", "edit" to "Изменить", "open" to "Открыть", "copy" to "Копировать",
        "delete" to "Удалить", "pin" to "Закрепить", "unpin" to "Открепить", "localOnly" to "Данные пока хранятся локально. Автосинхронизация и аккаунты ещё не реализованы.",
        "languageIntro" to "Выбери язык", "languageBody" to "Его можно изменить позже в настройках.", "continue" to "Продолжить",
        "importSuccess" to "Резервная копия импортирована", "importFailed" to "Не удалось прочитать файл резервной копии.", "emptySearch" to "Попробуй другой запрос или фильтр.",
        "version" to "Версия", "manage" to "Настрой Linka под себя", "local" to "НА ЭТОМ УСТРОЙСТВЕ"
    ),
    "az" to mapOf(
        "tagline" to "SƏNİN ŞƏXSİ MƏKANIN", "home" to "Ana səhifə", "inbox" to "Yadda saxlananlar", "search" to "Axtarış", "settings" to "Tənzimləmələr",
        "hero" to "Vacib olanı saxla.", "heroBody" to "Linklər, fikirlər və mətnlər — hamısı bir yerdə.",
        "quickCapture" to "Tez yadda saxla", "placeholder" to "Fikrini yaz və ya link əlavə et…", "save" to "Yadda saxla",
        "saved" to "Bu telefonda saxlanıldı", "recent" to "Son saxlananlar", "seeAll" to "Hamısı", "yourInbox" to "Sənin qeydlərin",
        "all" to "Hamısı", "pinned" to "Bərkidilənlər", "links" to "Linklər", "notes" to "Qeydlər", "items" to "element",
        "empty" to "Hələ heç nə yoxdur", "emptyBody" to "Yuxarıdan qeyd saxla və ya başqa tətbiqdən mətni Linka-ya göndər.",
        "private" to "Məxfilik standartdır", "privacyBody" to "Məlumat bu cihazda saxlanılır. Lazım olduqda ehtiyat nüsxə yarat.",
        "appearance" to "Görünüş", "language" to "Tətbiqin dili", "animations" to "Axıcı animasiyalar",
        "fontSize" to "Mətn ölçüsü", "updateAlerts" to "Yeniləmə bildirişləri", "updateAlertsBody" to "Yeni Android versiyası çıxanda xəbər ver.",
        "updates" to "Tətbiq yeniləmələri", "checkUpdates" to "Yeniləmələri yoxla", "checking" to "Yoxlanılır…", "latest" to "Ən son versiyadasan",
        "failed" to "Yeniləməni yoxlamaq mümkün olmadı. İnternet bağlantısını yoxla.", "available" to "Yeni Linka versiyası mövcuddur",
        "updateBody" to "Yeni versiya hazırdır. APK faylını endir və Android quraşdırmanı təsdiqləyəndə davam et.",
        "updateNow" to "Yeniləməni endir", "later" to "Sonra", "themeDark" to "Tünd", "themeLight" to "Açıq", "themeSystem" to "Sistem kimi",
        "data" to "Məlumatların", "export" to "Ehtiyat nüsxəni ixrac et", "import" to "Nüsxəni idxal et", "clearData" to "Bütün qeydləri sil",
        "clearConfirm" to "Bu cihazda saxlanılan bütün qeydlər birdəfəlik silinəcək. Lazımdırsa əvvəlcə ehtiyat nüsxə yarat.",
        "deleteAll" to "Hamısını sil", "cancel" to "Ləğv et", "done" to "Hazırdır", "agreement" to "İstifadəçi razılaşması",
        "readAgreement" to "İstifadəçi razılaşmasını oxu", "beforeBegin" to "Başlamazdan əvvəl", "termsIntro" to "Linka-nın məlumatlarını necə saxladığı barədə qısa məlumat.",
        "agree" to "Razıyam və davam et", "decline" to "İmtina et və bağla", "localStorage" to "1. Məlumat cihazda saxlanılır",
        "localStorageBody" to "Qeydlər bu telefonda saxlanılır. Tətbiqin məlumatlarını təmizləmək, onu silmək və ya cihazı itirmək qeydləri itirə bilər. Vacib məlumatların ehtiyat nüsxəsini yarat.",
        "noSync" to "2. Bulud sinxronizasiyası hələ yoxdur", "noSyncBody" to "Bu versiyada hesab və cihazlararası avtomatik sinxronizasiya mövcud deyil. Məlumatı əl ilə ixrac və idxal edə bilərsən.",
        "responsibility" to "3. Sənin məsuliyyətin", "responsibilityBody" to "Saxladığın məzmuna, cihazın təhlükəsizliyinə və ehtiyat nüsxələrə görə sən cavabdehsən. Vacib məlumatın yeganə nüsxəsi kimi Linka-ya güvənmə.",
        "external" to "4. Xarici keçidlər və ilkin versiya", "externalBody" to "Linklər Linka-dan kənarda açılır. İlkin versiyada xətalar ola bilər və fasiləsiz işə zəmanət verilmir.",
        "lawful" to "5. Qanuni istifadə", "lawfulBody" to "Tətbiqdən qanuni istifadə et və başqalarının hüquqlarına hörmət et. Başqalarının daxil ola bildiyi cihazda həssas məlumat saxlama.",
        "legalNote" to "Bu məlumat hüquqi məsləhət deyil.", "noResults" to "Nəticə tapılmadı", "searchHint" to "Link və qeydlərdə axtar…",
        "copied" to "Buferə köçürüldü", "deleted" to "Qeyd silindi", "edit" to "Dəyiş", "open" to "Aç", "copy" to "Köçür",
        "delete" to "Sil", "pin" to "Bərkid", "unpin" to "Aç", "localOnly" to "Məlumat bu cihazda saxlanılır. Avtomatik sinxronizasiya və hesablar hələ hazırlanmayıb.",
        "languageIntro" to "Dilini seç", "languageBody" to "Dili sonra tənzimləmələrdən dəyişə bilərsən.", "continue" to "Davam et",
        "importSuccess" to "Ehtiyat nüsxə idxal edildi", "importFailed" to "Ehtiyat nüsxə faylını oxumaq mümkün olmadı.", "emptySearch" to "Başqa axtarış və ya filtr yoxla.",
        "version" to "Versiya", "manage" to "Linka-nı özünə uyğunlaşdır", "local" to "BU CİHAZDA"
    ),
    "tr" to mapOf(
        "tagline" to "KİŞİSEL ALANIN", "home" to "Ana sayfa", "inbox" to "Kaydedilenler", "search" to "Ara", "settings" to "Ayarlar",
        "hero" to "Önemli olanı sakla.", "heroBody" to "Bağlantılar, düşünceler ve metinler tek bir yerde.",
        "quickCapture" to "Hızlı kaydet", "placeholder" to "Bir düşünce yaz veya bağlantı yapıştır…", "save" to "Kaydet",
        "saved" to "Bu telefona kaydedildi", "recent" to "Son kaydedilenler", "seeAll" to "Tümü", "yourInbox" to "Kaydedilenlerin",
        "all" to "Tümü", "pinned" to "Sabitlenenler", "links" to "Bağlantılar", "notes" to "Notlar", "items" to "öğe",
        "empty" to "Henüz bir şey yok", "emptyBody" to "Yukarıdan kaydet veya başka uygulamadan metni Linka'ya paylaş.",
        "private" to "Varsayılan olarak gizli", "privacyBody" to "Veriler bu cihazda tutulur. Gerektiğinde yedek dışa aktar.",
        "appearance" to "Görünüm", "language" to "Uygulama dili", "animations" to "Akıcı animasyonlar",
        "fontSize" to "Metin boyutu", "updateAlerts" to "Güncelleme bildirimleri", "updateAlertsBody" to "Yeni Android sürümü çıktığında bildir.",
        "updates" to "Uygulama güncellemeleri", "checkUpdates" to "Güncellemeleri kontrol et", "checking" to "Kontrol ediliyor…", "latest" to "Güncelsin",
        "failed" to "Güncellemeler kontrol edilemedi. Bağlantını kontrol edip tekrar dene.", "available" to "Yeni Linka sürümü hazır",
        "updateBody" to "Yeni bir sürüm var. APK dosyasını indir ve Android istediğinde kurulumu onayla.",
        "updateNow" to "Güncellemeyi indir", "later" to "Daha sonra", "themeDark" to "Koyu", "themeLight" to "Açık", "themeSystem" to "Sistem",
        "data" to "Verilerin", "export" to "Yedeği dışa aktar", "import" to "Yedeği içe aktar", "clearData" to "Tüm kayıtları sil",
        "clearConfirm" to "Bu cihazdaki tüm kayıtlar kalıcı olarak silinecek. Gerekliyse önce yedek oluştur.",
        "deleteAll" to "Tümünü sil", "cancel" to "İptal", "done" to "Tamam", "agreement" to "Kullanıcı sözleşmesi",
        "readAgreement" to "Kullanıcı sözleşmesini oku", "beforeBegin" to "Başlamadan önce", "termsIntro" to "Linka'nın verilerini nasıl tuttuğuna dair kısa bilgi.",
        "agree" to "Kabul et ve devam et", "decline" to "Reddet ve kapat", "localStorage" to "1. Cihazda depolama",
        "localStorageBody" to "Kayıtlar bu telefonda tutulur. Uygulama verilerini temizlemek, uygulamayı kaldırmak veya cihazı kaybetmek kayıtları silebilir. Önemli verileri yedekle.",
        "noSync" to "2. Henüz bulut senkronizasyonu yok", "noSyncBody" to "Bu sürümde hesaplar ve otomatik cihazlar arası senkronizasyon yoktur. Verileri dışa/içe aktarma ile taşı.",
        "responsibility" to "3. Sorumluluk", "responsibilityBody" to "Kaydettiğin içerik, cihaz güvenliği ve yedeklerden sen sorumlusun. Kritik verilerin tek kopyası olarak Linka'ya güvenme.",
        "external" to "4. Harici hizmetler ve erken erişim", "externalBody" to "Harici bağlantılar Linka dışında açılır. Bu erken sürüm hata içerebilir; kesintisiz çalışma garantisi yoktur.",
        "lawful" to "5. Yasal kullanım", "lawfulBody" to "Uygulamayı yasalara uygun kullan ve başkalarının haklarına saygı göster. Başkalarının erişebildiği cihazlarda hassas bilgi tutma.",
        "legalNote" to "Bu metin profesyonel hukuki tavsiye değildir.", "noResults" to "Sonuç bulunamadı", "searchHint" to "Bağlantı ve notlarda ara…",
        "copied" to "Panoya kopyalandı", "deleted" to "Kayıt silindi", "edit" to "Düzenle", "open" to "Aç", "copy" to "Kopyala",
        "delete" to "Sil", "pin" to "Sabitle", "unpin" to "Sabitlemeyi kaldır", "localOnly" to "Veriler cihazda tutulur. Otomatik senkronizasyon ve hesaplar henüz uygulanmadı.",
        "languageIntro" to "Dilini seç", "languageBody" to "Bunu daha sonra Ayarlar'dan değiştirebilirsin.", "continue" to "Devam",
        "importSuccess" to "Yedek içe aktarıldı", "importFailed" to "Yedek dosyası okunamadı.", "emptySearch" to "Başka bir arama veya filtre dene.",
        "version" to "Sürüm", "manage" to "Linka deneyimini kişiselleştir", "local" to "BU CİHAZDA"
    )
)
private fun tr(lang: String, key: String) = words[lang]?.get(key) ?: words["en"]?.get(key) ?: key

class MainActivity : ComponentActivity() {
    private var incomingSharedText by mutableStateOf("")
    private var updateInfo by mutableStateOf<UpdateInfo?>(null)
    private var updateStatus by mutableStateOf("")
    private var checkingUpdates by mutableStateOf(false)
    private fun prefs() = getSharedPreferences(PREFS, MODE_PRIVATE)
    private fun appVersion() = runCatching { packageManager.getPackageInfo(packageName, 0).versionName ?: "0.4.0" }.getOrDefault("0.4.0")
    private fun loadCaptures(): List<Capture> = try {
        val array = JSONArray(prefs().getString(CAPTURES_KEY, "[]") ?: "[]")
        (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            val value = o.optString("text", "").trim()
            val created = o.optLong("createdAt", 0L)
            if (value.isBlank() || created <= 0L) null else Capture(
                o.optString("id", UUID.randomUUID().toString()), value.take(MAX_CAPTURE_CHARS),
                created, o.optLong("updatedAt", created), o.optBoolean("pinned", false)
            )
        }.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt }).take(MAX_CAPTURES)
    } catch (_: Exception) { emptyList() }
    private fun saveCaptures(list: List<Capture>) {
        val array = JSONArray()
        list.take(MAX_CAPTURES).forEach { c ->
            array.put(JSONObject().put("id", c.id).put("text", c.text.take(MAX_CAPTURE_CHARS))
                .put("createdAt", c.createdAt).put("updatedAt", c.updatedAt).put("pinned", c.pinned))
        }
        prefs().edit().putString(CAPTURES_KEY, array.toString()).apply()
    }
    private fun openExternal(value: String) { runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(value.trim()))) } }
    private fun copyText(value: String) {
        (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Linka", value))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        scheduleUpdateChecks()
        incomingSharedText = extractSharedText(intent)
        checkForUpdate(true)
        setContent {
            var theme by remember { mutableStateOf(prefs().getString(THEME_KEY, "dark") ?: "dark") }
            var language by remember { mutableStateOf(prefs().getString(LANGUAGE_KEY, "") ?: "") }
            var accepted by remember { mutableStateOf(prefs().getString(TERMS_KEY, "") == TERMS_VERSION) }
            var animations by remember { mutableStateOf(prefs().getBoolean(ANIMATIONS_KEY, true)) }
            var fontScale by remember { mutableFloatStateOf(prefs().getFloat(FONT_SCALE_KEY, 1f).coerceIn(.9f, 1.2f)) }
            var alerts by remember { mutableStateOf(prefs().getBoolean(UPDATE_ALERTS_KEY, true)) }
            val darkSystem = androidx.compose.foundation.isSystemInDarkTheme()
            val dark = theme == "dark" || (theme == "system" && darkSystem)
            MaterialTheme(colorScheme = if (dark) darkColorScheme(
                background = DB, surface = DS, primary = DT, onPrimary = DB, onBackground = DT, onSurface = DT, surfaceVariant = DR, outline = DBR
            ) else lightColorScheme(
                background = LB, surface = LS, primary = LT, onPrimary = LS, onBackground = LT, onSurface = LT, surfaceVariant = LR, outline = LBR
            )) {
                LinkaApp(
                    sharedText = incomingSharedText, load = { loadCaptures() }, save = { saveCaptures(it) },
                    copy = { copyText(it) }, open = { openExternal(it) },
                    theme = theme, setTheme = { theme = it; prefs().edit().putString(THEME_KEY, it).apply() },
                    language = language, setLanguage = { language = it; prefs().edit().putString(LANGUAGE_KEY, it).apply() },
                    animations = animations, setAnimations = { animations = it; prefs().edit().putBoolean(ANIMATIONS_KEY, it).apply() },
                    fontScale = fontScale, setFontScale = { fontScale = it; prefs().edit().putFloat(FONT_SCALE_KEY, it).apply() },
                    alerts = alerts, setAlerts = { enabled ->
                        if (enabled && Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7402)
                        }
                        alerts = enabled
                        prefs().edit().putBoolean(UPDATE_ALERTS_KEY, enabled).apply()
                        if (enabled && updateInfo != null) notifyUpdate(updateInfo!!)
                    },
                    updateInfo = updateInfo, updateStatus = updateStatus, checking = checkingUpdates,
                    checkUpdates = { checkForUpdate(false) }, openUpdate = { openExternal(it) },
                    version = appVersion(), accepted = accepted,
                    agree = {
                        prefs().edit().putString(TERMS_KEY, TERMS_VERSION).apply()
                        accepted = true
                        if (Build.VERSION.SDK_INT >= 33 && alerts &&
                            !prefs().getBoolean("notification_permission_asked", false) &&
                            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                            prefs().edit().putBoolean("notification_permission_asked", true).apply()
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

    @Deprecated("Deprecated in Android API 33")
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 7402 && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            val found = updateInfo
            if (found != null && notifyUpdate(found)) prefs().edit().putString(LAST_NOTIFIED_KEY, found.version).apply()
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
        WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
            "linka-update-checks",
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
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
                            newer = UpdateInfo(tag, apk, release.optString("html_url", "https://github.com/anarabbasov2010-eng/Linka/releases"))
                        } else if (!quiet) status = "latest"
                    } else if (!quiet) status = "failed"
                } finally { conn.disconnect() }
            } catch (_: Exception) { if (!quiet) status = "failed" }
            runOnUiThread {
                checkingUpdates = false
                updateInfo = newer
                updateStatus = status
                if (newer != null && prefs().getBoolean(UPDATE_ALERTS_KEY, true)) {
                    val last = prefs().getString(LAST_NOTIFIED_KEY, "") ?: ""
                    if (last != newer!!.version && notifyUpdate(newer!!)) {
                        prefs().edit().putString(LAST_NOTIFIED_KEY, newer!!.version).apply()
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
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel(NOTIFICATION_CHANNEL, "Linka updates", NotificationManager.IMPORTANCE_DEFAULT))
        val pending = PendingIntent.getActivity(this, 42, Intent(Intent.ACTION_VIEW, Uri.parse(info.downloadUrl)),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(this, NOTIFICATION_CHANNEL) else {
            @Suppress("DEPRECATION") android.app.Notification.Builder(this)
        }
        manager.notify(4107, notification.setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("Linka ${info.version} is available")
            .setContentText("Tap to download the latest Android version.")
            .setContentIntent(pending).setAutoCancel(true).build())
        return true
    }
}

@Composable
private fun LinkaApp(
    sharedText: String, load: () -> List<Capture>, save: (List<Capture>) -> Unit, copy: (String) -> Unit, open: (String) -> Unit,
    theme: String, setTheme: (String) -> Unit, language: String, setLanguage: (String) -> Unit,
    animations: Boolean, setAnimations: (Boolean) -> Unit, fontScale: Float, setFontScale: (Float) -> Unit,
    alerts: Boolean, setAlerts: (Boolean) -> Unit, updateInfo: UpdateInfo?, updateStatus: String, checking: Boolean,
    checkUpdates: () -> Unit, openUpdate: (String) -> Unit, version: String, accepted: Boolean, agree: () -> Unit, decline: () -> Unit
) {
    val lang = language.ifBlank { "en" }
    val dark = MaterialTheme.colorScheme.background == DB
    val bg = if (dark) DB else LB
    val panel = if (dark) DS else LS
    val raised = if (dark) DR else LR
    val border = if (dark) DBR else LBR
    val main = if (dark) DT else LT
    val muted = if (dark) DM else LM
    val context = LocalContext.current
    var captures by remember { mutableStateOf(load()) }
    var draft by remember { mutableStateOf(sharedText) }
    var editingId by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("all") }
    var tab by remember { mutableStateOf(0) }
    var languageDialog by remember { mutableStateOf(false) }
    var agreementDialog by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var deleting by remember { mutableStateOf<Capture?>(null) }
    var clearDialog by remember { mutableStateOf(false) }
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) runCatching {
            val raw = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } ?: error("empty file")
            val array = JSONArray(raw)
            val imported = (0 until array.length()).mapNotNull { i ->
                val o = array.optJSONObject(i) ?: return@mapNotNull null
                val text = o.optString("text", "").trim().take(MAX_CAPTURE_CHARS)
                if (text.isBlank()) null else {
                    val now = System.currentTimeMillis()
                    Capture(o.optString("id", UUID.randomUUID().toString()), text, o.optLong("createdAt", now), o.optLong("updatedAt", now), o.optBoolean("pinned", false))
                }
            }
            captures = (imported + captures).distinctBy { it.id }.take(MAX_CAPTURES)
            save(captures); message = tr(lang, "importSuccess")
        }.onFailure { message = tr(lang, "importFailed") }
    }
    fun commit(list: List<Capture>) {
        captures = list.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt }).take(MAX_CAPTURES)
        save(captures)
    }
    LaunchedEffect(sharedText) {
        if (sharedText.isNotBlank()) {
            draft = sharedText
            editingId = null
            tab = 0
        }
    }
    val visible = captures.filter { c ->
        val isLink = c.text.startsWith("http://", true) || c.text.startsWith("https://", true)
        val kind = when (filter) { "pinned" -> c.pinned; "links" -> isLink; "notes" -> !isLink; else -> true }
        kind && (tab != 2 || query.isBlank() || c.text.contains(query.trim(), ignoreCase = true))
    }.sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt })

    if (language.isBlank()) {
        LanguageWelcome(dark, animations, onContinue = { setLanguage(it) })
        return
    }

    Scaffold(
        containerColor = bg,
        contentWindowInsets = WindowInsets.statusBars,
        bottomBar = {
            NavigationBar(containerColor = panel, tonalElevation = 0.dp, windowInsets = WindowInsets.navigationBars) {
                val items = listOf(
                    Triple(0, Icons.Outlined.Home, tr(lang, "home")),
                    Triple(1, Icons.Outlined.Inbox, tr(lang, "inbox")),
                    Triple(2, Icons.Outlined.Search, tr(lang, "search")),
                    Triple(3, Icons.Outlined.Settings, tr(lang, "settings"))
                )
                items.forEach { (id, icon, label) ->
                    NavigationBarItem(selected = tab == id, onClick = { tab = id },
                        icon = { Icon(icon, contentDescription = label, modifier = Modifier.size(21.dp)) },
                        label = { Text(label, fontSize = 10.sp * fontScale, maxLines = 1) }, alwaysShowLabel = true)
                }
            }
        }
    ) { padding ->
        AnimatedContent(
            targetState = tab, modifier = Modifier.fillMaxSize().padding(padding),
            transitionSpec = {
                if (animations) (fadeIn(spring(dampingRatio = .86f, stiffness = 340f)) + slideInVertically { it / 28 }) togetherWith
                    (fadeOut(spring(dampingRatio = 1f, stiffness = 400f)) + slideOutVertically { -it / 40 })
                else fadeIn() togetherWith fadeOut()
            }, label = "linka-page"
        ) { page ->
            Column(Modifier.fillMaxSize().background(bg).verticalScroll(rememberScrollState()).imePadding()
                .padding(horizontal = 18.dp).padding(top = 12.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Header(lang, main, muted, panel, border) { tab = 3 }
                when (page) {
                    0 -> {
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp).let { it }, modifier = Modifier.padding(top = 5.dp, bottom = 3.dp)) {
                            Text(tr(lang, "hero"), color = main, fontSize = 31.sp * fontScale, lineHeight = 36.sp * fontScale,
                                fontWeight = FontWeight.Medium, letterSpacing = (-1.5).sp)
                            Text(tr(lang, "heroBody"), color = muted, fontSize = 13.sp * fontScale, lineHeight = 19.sp * fontScale)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                            StatCard(captures.size.toString(), tr(lang, "inbox"), panel, border, main, muted, Modifier.weight(1f))
                            StatCard(captures.count { it.pinned }.toString(), tr(lang, "pinned"), panel, border, main, muted, Modifier.weight(1f))
                            StatCard(captures.count { it.text.startsWith("http", true) }.toString(), tr(lang, "links"), panel, border, main, muted, Modifier.weight(1f))
                        }
                        SectionTitle(tr(lang, "quickCapture"), main)
                        Card(colors = CardDefaults.cardColors(containerColor = panel), shape = RoundedCornerShape(22.dp),
                            border = BorderStroke(1.dp, border), modifier = Modifier.fillMaxWidth().animateContentSize(spring(dampingRatio = .82f, stiffness = 320f))) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                                OutlinedTextField(value = draft, onValueChange = { draft = it.take(MAX_CAPTURE_CHARS) }, modifier = Modifier.fillMaxWidth(),
                                    placeholder = { Text(tr(lang, "placeholder"), color = muted, fontSize = 13.sp * fontScale) },
                                    textStyle = TextStyle(color = main, fontSize = 14.sp * fontScale, lineHeight = 20.sp * fontScale),
                                    minLines = 3, maxLines = 7, shape = RoundedCornerShape(15.dp), colors = fieldColors(bg, border, main, muted))
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
                                AnimatedVisibility(message.isNotBlank(), enter = fadeIn() + slideInVertically { it / 4 }, exit = fadeOut()) {
                                    Text(message, color = muted, fontSize = 11.sp * fontScale)
                                }
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            SectionTitle(tr(lang, "recent"), main, Modifier.weight(1f))
                            TextButton(onClick = { tab = 1 }) { Text(tr(lang, "seeAll"), color = muted, fontSize = 11.sp) }
                        }
                        if (captures.isEmpty()) EmptyState(lang, panel, border, main, muted)
                        else captures.take(3).forEach { c -> CaptureCard(c, lang, panel, raised, border, main, muted, fontScale,
                            onPin = { item -> commit(captures.map { if (it.id == item.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it }) },
                            onCopy = { copy(it.text); message = tr(lang, "copied") }, onOpen = { open(it.text) },
                            onEdit = { draft = it.text; editingId = it.id; tab = 0; message = tr(lang, "edit") },
                            onDelete = { deleting = it })
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
                            textStyle = TextStyle(color = main, fontSize = 13.sp * fontScale), shape = RoundedCornerShape(15.dp),
                            colors = fieldColors(panel, border, main, muted))
                        FilterRow(lang, filter, { filter = it })
                        Text("${visible.size} ${tr(lang, "items")}", color = muted, fontSize = 11.sp)
                        if (visible.isEmpty()) EmptyState(lang, panel, border, main, muted, if (page == 2 && query.isNotBlank()) "noResults" else "empty")
                        else visible.forEach { c -> CaptureCard(c, lang, panel, raised, border, main, muted, fontScale,
                            onPin = { item -> commit(captures.map { if (it.id == item.id) it.copy(pinned = !it.pinned, updatedAt = System.currentTimeMillis()) else it }) },
                            onCopy = { copy(it.text); message = tr(lang, "copied") }, onOpen = { open(it.text) },
                            onEdit = { draft = it.text; editingId = it.id; tab = 0; message = tr(lang, "edit") },
                            onDelete = { deleting = it })
                        }
                    }
                    else -> {
                        Text(tr(lang, "settings"), color = main, fontSize = 28.sp * fontScale, fontWeight = FontWeight.Medium, letterSpacing = (-1).sp)
                        Text(tr(lang, "manage"), color = muted, fontSize = 12.sp * fontScale)
                        SettingsGroup(tr(lang, "appearance"), panel, border, main) {
                            Text(tr(lang, "appearance"), color = main, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                listOf("dark" to tr(lang, "themeDark"), "light" to tr(lang, "themeLight"), "system" to tr(lang, "themeSystem")).forEach { (v, label) ->
                                    FilterChip(selected = theme == v, onClick = { setTheme(v) }, label = { Text(label, fontSize = 11.sp) })
                                }
                            }
                            SettingLine(Icons.Outlined.Language, tr(lang, "language"), languages.first { it.first == lang }.second, main, muted) { languageDialog = true }
                            SettingSwitch(tr(lang, "animations"), animations, setAnimations, main, muted)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(tr(lang, "fontSize"), color = main, fontSize = 12.sp, modifier = Modifier.weight(1f))
                                Text("${(fontScale * 100).toInt()}%", color = muted, fontSize = 11.sp)
                            }
                            Slider(value = fontScale, onValueChange = setFontScale, valueRange = .9f..1.2f, steps = 5)
                        }
                        SettingsGroup(tr(lang, "updates"), panel, border, main) {
                            SettingSwitch(tr(lang, "updateAlerts"), alerts, setAlerts, main, muted, tr(lang, "updateAlertsBody"))
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
                                        Button(onClick = { openUpdate(updateInfo.downloadUrl) }, modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = main, contentColor = bg)) {
                                            Text(tr(lang, "updateNow"), fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                            Text("${tr(lang, "version")}: $version", color = muted, fontSize = 10.sp)
                        }
                        SettingsGroup(tr(lang, "data"), panel, border, main) {
                            SettingLine(Icons.Outlined.ContentCopy, tr(lang, "export"), "", main, muted) {
                                val array = JSONArray()
                                captures.forEach { c -> array.put(JSONObject().put("id", c.id).put("text", c.text).put("createdAt", c.createdAt).put("updatedAt", c.updatedAt).put("pinned", c.pinned)) }
                                val send = Intent(Intent.ACTION_SEND).apply { type = "application/json"; putExtra(Intent.EXTRA_SUBJECT, "Linka backup"); putExtra(Intent.EXTRA_TEXT, array.toString(2)) }
                                context.startActivity(Intent.createChooser(send, tr(lang, "export")))
                            }
                            SettingLine(Icons.Outlined.Inbox, tr(lang, "import"), "", main, muted) { importLauncher.launch(arrayOf("application/json", "text/*", "application/octet-stream")) }
                            AnimatedVisibility(message.isNotBlank()) { Text(message, color = muted, fontSize = 11.sp) }
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
        Surface(shape = RoundedCornerShape(13.dp), color = panel, border = BorderStroke(1.dp, border)) {
            androidx.compose.foundation.Image(painterResource(R.drawable.linka_mark), "Linka logo", Modifier.size(43.dp).padding(4.dp))
        }
        Column {
            Text("linka", color = main, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-1.4).sp)
            Text(tr(lang, "tagline"), color = muted, fontSize = 8.sp, letterSpacing = 1.2.sp)
        }
        Spacer(Modifier.weight(1f))
        Surface(color = panel, shape = CircleShape, border = BorderStroke(1.dp, border)) {
            Row(Modifier.padding(horizontal = 9.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Box(Modifier.size(5.dp).background(Color(0xFF74B99B), CircleShape))
                Text(tr(lang, "local"), color = muted, fontSize = 8.sp, letterSpacing = .5.sp)
            }
        }
        IconButton(onClick = onSettings) { Icon(Icons.Outlined.Tune, tr(lang, "settings"), tint = muted) }
    }
}

@Composable
private fun StatCard(value: String, label: String, panel: Color, border: Color, main: Color, muted: Color, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = panel), border = BorderStroke(1.dp, border)) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 13.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(value, color = main, fontSize = 23.sp, fontWeight = FontWeight.Medium, letterSpacing = (-1).sp)
            Text(label, color = muted, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
    capture: Capture, lang: String, panel: Color, raised: Color, border: Color, main: Color, muted: Color, scale: Float,
    onPin: (Capture) -> Unit, onCopy: (Capture) -> Unit, onOpen: (Capture) -> Unit, onEdit: (Capture) -> Unit, onDelete: (Capture) -> Unit
) {
    val link = capture.text.startsWith("http://", true) || capture.text.startsWith("https://", true)
    Card(colors = CardDefaults.cardColors(containerColor = if (capture.pinned) raised else panel), border = BorderStroke(1.dp, border),
        shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().animateContentSize(spring(dampingRatio = .82f, stiffness = 320f))) {
        Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Icon(if (link) Icons.Outlined.Link else Icons.Outlined.NoteAlt, null, tint = muted, modifier = Modifier.size(16.dp))
                Text(if (capture.pinned) tr(lang, "pinned").uppercase() else tr(lang, if (link) "links" else "notes").uppercase(), color = muted, fontSize = 9.sp, letterSpacing = 1.sp)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { onPin(capture) }, modifier = Modifier.size(30.dp)) {
                    Icon(Icons.Outlined.PushPin, tr(lang, if (capture.pinned) "unpin" else "pin"), tint = if (capture.pinned) main else muted, modifier = Modifier.size(17.dp))
                }
            }
            Text(capture.text, color = main, fontSize = 13.sp * scale, lineHeight = 19.sp * scale, maxLines = 8, overflow = TextOverflow.Ellipsis)
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
            Surface(color = if (MaterialTheme.colorScheme.background == DB) DR else LR, shape = CircleShape) {
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
    Card(colors = CardDefaults.cardColors(containerColor = panel), border = BorderStroke(1.dp, border), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
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
