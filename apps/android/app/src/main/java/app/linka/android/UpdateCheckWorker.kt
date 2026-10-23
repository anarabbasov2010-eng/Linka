package app.linka.android

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

private const val LINKA_PREFS = "linka_local_v3"
private const val UPDATE_ALERTS_KEY = "update_alerts"
private const val LANGUAGE_KEY = "language"
private const val LAST_NOTIFIED_KEY = "last_notified_version"
private const val CHANNEL_ID = "linka_updates"
private const val RELEASE_URL = "https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest"

class UpdateCheckWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(LINKA_PREFS, Context.MODE_PRIVATE)
        val alertsEnabled = prefs.getBoolean(UPDATE_ALERTS_KEY, true)
        val autoDownload = prefs.getBoolean(AUTO_DOWNLOAD_KEY, false)
        if (!alertsEnabled && !autoDownload) return Result.success()

        return try {
            val connection = URL(RELEASE_URL).openConnection() as HttpURLConnection
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            connection.setRequestProperty("Accept", "application/vnd.github+json")
            connection.setRequestProperty("User-Agent", "Linka-Android-UpdateWorker")
            try {
                if (connection.responseCode != 200) {
                    return if (connection.responseCode == 403 || connection.responseCode >= 500) Result.retry() else Result.success()
                }
                val release = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                val latestVersion = release.optString("tag_name", "").removePrefix("v")
                val assets = release.optJSONArray("assets") ?: JSONArray()
                var apkUrl = ""
                var fallbackApkUrl = ""
                for (i in 0 until assets.length()) {
                    val asset = assets.optJSONObject(i) ?: continue
                    val name = asset.optString("name", "")
                    if (name.endsWith(".apk", ignoreCase = true)) {
                        if (fallbackApkUrl.isBlank()) fallbackApkUrl = asset.optString("browser_download_url", "")
                        if (name.startsWith("Linka-Android-", ignoreCase = true)) {
                            apkUrl = asset.optString("browser_download_url", "")
                            break
                        }
                    }
                }
                if (apkUrl.isBlank()) apkUrl = fallbackApkUrl
                if (latestVersion.isBlank() || apkUrl.isBlank()) return Result.success()

                val currentVersion = applicationContext.packageManager
                    .getPackageInfo(applicationContext.packageName, 0).versionName ?: "0.4.0"
                if (compareVersions(latestVersion, currentVersion) <= 0) return Result.success()

                var downloadedFile: File? = null
                if (autoDownload) {
                    downloadedFile = downloadApk(apkUrl, latestVersion)
                    if (downloadedFile == null) return Result.retry()
                }

                if (!alertsEnabled || (prefs.getString(LAST_NOTIFIED_KEY, "") ?: "") == latestVersion) return Result.success()
                if (Build.VERSION.SDK_INT >= 33 &&
                    ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    return Result.success()
                }
                if (!NotificationManagerCompat.from(applicationContext).areNotificationsEnabled()) {
                    // Do not mark this version as notified; a later run can alert after the user enables notifications.
                    return Result.success()
                }

                val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (Build.VERSION.SDK_INT >= 26) {
                    manager.createNotificationChannel(NotificationChannel(
                        CHANNEL_ID, "Linka updates", NotificationManager.IMPORTANCE_DEFAULT
                    ))
                    if (manager.getNotificationChannel(CHANNEL_ID)?.importance == NotificationManager.IMPORTANCE_NONE) {
                        // A user-disabled channel must not consume the one-notification-per-version marker.
                        return Result.success()
                    }
                }
                val pending = PendingIntent.getActivity(
                    applicationContext, 4107,
                    applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)
                        ?: Intent(applicationContext, MainActivity::class.java),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val language = (prefs.getString(LANGUAGE_KEY, "") ?: "").ifBlank { Locale.getDefault().language }.lowercase(Locale.ROOT)
                val title = when (language) {
                    "ru" -> "Доступна Linka $latestVersion"
                    "az" -> "Linka $latestVersion mövcuddur"
                    "tr" -> "Linka $latestVersion hazır"
                    else -> "Linka $latestVersion is available"
                }
                val text = when (language) {
                    "ru" -> if (downloadedFile != null) "Обновление скачано. Открой Linka, чтобы установить его." else "Открой Linka, чтобы скачать обновление."
                    "az" -> if (downloadedFile != null) "Yeniləmə endirildi. Quraşdırmaq üçün Linka-nı aç." else "Yeniləməni endirmək üçün Linka-nı aç."
                    "tr" -> if (downloadedFile != null) "Güncelleme indirildi. Kurmak için Linka'yı aç." else "Güncellemeyi indirmek için Linka'yı aç."
                    else -> if (downloadedFile != null) "Update downloaded. Open Linka to install it." else "Open Linka to download the update."
                }
                val notification = if (Build.VERSION.SDK_INT >= 26) {
                    android.app.Notification.Builder(applicationContext, CHANNEL_ID)
                } else {
                    @Suppress("DEPRECATION")
                    android.app.Notification.Builder(applicationContext)
                }
                manager.notify(4107, notification
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setContentIntent(pending)
                    .setAutoCancel(true)
                    .setPriority(android.app.Notification.PRIORITY_DEFAULT)
                    .build())
                prefs.edit().putString(LAST_NOTIFIED_KEY, latestVersion).apply()
                Result.success()
            } finally {
                connection.disconnect()
            }
        } catch (_: Exception) {
            Result.retry()
        }
    }

    private fun downloadApk(url: String, version: String): File? {
        if (!url.startsWith("https://")) return null
        val folder = File(applicationContext.cacheDir, "updates").apply { mkdirs() }
        val safeVersion = version.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val target = File(folder, "linka-update-$safeVersion.apk")
        if (target.isFile && target.length() > 1024L) {
            if (validateLinkaUpdateApk(applicationContext, target) == null) return target
            target.delete()
        }
        val temp = File(folder, "linka-update-$safeVersion.apk.part")
        return try {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 20000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "Linka-Android")
                setRequestProperty("Accept", "application/octet-stream")
            }
            try {
                if (connection.responseCode !in 200..299) return null
                if (connection.contentLengthLong > 200L * 1024L * 1024L) return null
                connection.inputStream.use { input ->
                    FileOutputStream(temp).use { output ->
                        val buffer = ByteArray(32 * 1024)
                        var read: Int
                        var total = 0L
                        while (input.read(buffer).also { read = it } != -1) {
                            total += read
                            if (total > 200L * 1024L * 1024L) error("APK exceeds size limit")
                            output.write(buffer, 0, read)
                        }
                        output.fd.sync()
                    }
                }
                if (temp.length() < 1024L) return null
                val magic = temp.inputStream().use { input -> ByteArray(4).also { input.read(it) } }
                if (magic[0] != 0x50.toByte() || magic[1] != 0x4b.toByte()) return null
                if (validateLinkaUpdateApk(applicationContext, temp) != null) return null
                if (target.exists()) target.delete()
                if (!temp.renameTo(target)) return null
                target
            } finally {
                connection.disconnect()
            }
        } catch (_: Exception) {
            null
        } finally {
            if (temp.exists()) temp.delete()
        }
    }

    private fun compareVersions(a: String, b: String): Int {
        val left = Regex("[0-9]+").findAll(a).map { it.value.toLongOrNull() ?: 0L }.toList()
        val right = Regex("[0-9]+").findAll(b).map { it.value.toLongOrNull() ?: 0L }.toList()
        for (i in 0 until maxOf(left.size, right.size)) {
            val x = left.getOrElse(i) { 0L }
            val y = right.getOrElse(i) { 0L }
            if (x != y) return x.compareTo(y)
        }
        return 0
    }
}
