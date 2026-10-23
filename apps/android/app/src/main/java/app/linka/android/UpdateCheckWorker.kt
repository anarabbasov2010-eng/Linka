package app.linka.android

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val LINKA_PREFS = "linka_local_v3"
private const val UPDATE_ALERTS_KEY = "update_alerts"
private const val LAST_NOTIFIED_KEY = "last_notified_version"
private const val CHANNEL_ID = "linka_updates"
private const val RELEASE_URL = "https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest"

class UpdateCheckWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(LINKA_PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(UPDATE_ALERTS_KEY, true)) return Result.success()

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
                for (i in 0 until assets.length()) {
                    val asset = assets.optJSONObject(i) ?: continue
                    if (asset.optString("name", "").endsWith(".apk", ignoreCase = true)) {
                        apkUrl = asset.optString("browser_download_url", "")
                        if (asset.optString("name", "").contains("release", ignoreCase = true)) break
                    }
                }
                if (latestVersion.isBlank() || apkUrl.isBlank()) return Result.success()

                val currentVersion = applicationContext.packageManager
                    .getPackageInfo(applicationContext.packageName, 0).versionName ?: "0.4.0"
                if (compareVersions(latestVersion, currentVersion) <= 0) return Result.success()
                if ((prefs.getString(LAST_NOTIFIED_KEY, "") ?: "") == latestVersion) return Result.success()

                if (Build.VERSION.SDK_INT >= 33 &&
                    ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    return Result.success()
                }

                val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (Build.VERSION.SDK_INT >= 26) {
                    manager.createNotificationChannel(NotificationChannel(
                        CHANNEL_ID, "Linka updates", NotificationManager.IMPORTANCE_DEFAULT
                    ))
                }
                val pending = PendingIntent.getActivity(
                    applicationContext, 4107,
                    Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl)),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val notification = if (Build.VERSION.SDK_INT >= 26) {
                    android.app.Notification.Builder(applicationContext, CHANNEL_ID)
                } else {
                    @Suppress("DEPRECATION")
                    android.app.Notification.Builder(applicationContext)
                }
                manager.notify(4107, notification
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle("Linka $latestVersion is available")
                    .setContentText("Tap to download and install the latest version.")
                    .setContentIntent(pending)
                    .setAutoCancel(true)
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
