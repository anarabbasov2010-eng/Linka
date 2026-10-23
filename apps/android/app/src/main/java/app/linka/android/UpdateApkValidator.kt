package app.linka.android

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import java.io.File
import java.security.MessageDigest
import java.util.Locale

/**
 * Validates an APK before Android's package installer is launched.
 * The update must target this package, have a larger version code, and use
 * exactly the same signing certificate as the currently installed app.
 */
internal fun validateLinkaUpdateApk(context: Context, file: File): String? {
    if (!file.isFile || file.length() < 1024L) return "The downloaded APK is incomplete."

    @Suppress("DEPRECATION")
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        PackageManager.GET_SIGNING_CERTIFICATES
    } else {
        PackageManager.GET_SIGNATURES
    }
    val archive = context.packageManager.getPackageArchiveInfo(file.absolutePath, flags)
        ?: return "Android could not read the downloaded APK."

    if (archive.packageName != context.packageName) {
        return "This update belongs to a different Linka installation. It was blocked to protect your data."
    }

    val installed = try {
        context.packageManager.getPackageInfo(context.packageName, flags)
    } catch (_: Exception) {
        return "Could not verify the installed Linka package."
    }

    val installedCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) installed.longVersionCode else installed.versionCode.toLong()
    val updateCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) archive.longVersionCode else archive.versionCode.toLong()
    if (updateCode <= installedCode) return "The downloaded APK is not newer than this installation."

    fun signerDigests(info: PackageInfo): Set<String> {
        val signatures: Array<android.content.pm.Signature> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.signingInfo?.apkContentsSigners ?: emptyArray()
        } else {
            @Suppress("DEPRECATION")
            info.signatures ?: emptyArray()
        }
        return signatures.map { signature ->
            MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())
                .joinToString("") { byte -> "%02x".format(Locale.ROOT, byte.toInt() and 0xff) }
        }.toSet()
    }

    val expected = signerDigests(installed)
    val actual = signerDigests(archive)
    if (expected.isEmpty() || actual.isEmpty() || expected != actual) {
        return "The update's signing certificate does not match this installation. Installation was blocked."
    }
    return null
}
