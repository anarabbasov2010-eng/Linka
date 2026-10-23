package app.linka.android

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.time.Instant
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

internal data class CloudSyncResult(
    val captures: List<Capture>,
    val deletedIds: Set<String>,
    val encryptedRefreshToken: String,
    val message: String,
    val profile: JSONObject? = null
)

private object LinkaTokenVault {
    private const val ALIAS = "linka_cloud_refresh_v1"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }

    fun encrypt(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val body = cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(body, Base64.NO_WRAP)
    }

    fun decrypt(value: String): String {
        val bytes = Base64.decode(value, Base64.NO_WRAP)
        require(bytes.size > 12) { "Saved sync session is invalid. Sign in again." }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        return cipher.doFinal(bytes.copyOfRange(12, bytes.size)).toString(Charsets.UTF_8)
    }
}

private fun requestJson(
    url: String,
    method: String,
    anonKey: String,
    bearer: String? = null,
    body: String? = null,
    prefer: String? = null
): String {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
        requestMethod = method
        connectTimeout = 12_000
        readTimeout = 15_000
        instanceFollowRedirects = false
        setRequestProperty("apikey", anonKey)
        setRequestProperty("Accept", "application/json")
        if (bearer != null) setRequestProperty("Authorization", "Bearer $bearer")
        if (body != null) {
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
        }
        if (prefer != null) setRequestProperty("Prefer", prefer)
    }
    try {
        if (body != null) connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText().take(1_000_000) }.orEmpty()
        if (code !in 200..299) {
            val detail = runCatching { JSONObject(text).optString("message").ifBlank { JSONObject(text).optString("msg") } }.getOrDefault("")
            throw IllegalStateException(
                when {
                    code == 401 || code == 403 -> "Sign-in failed. Check your email, password and public anon key."
                    code == 404 || (code == 400 && text.contains("linka_sync", true)) ->
                        "Cloud table not found. Copy the SQL setup in Linka and run it in the Supabase SQL Editor."
                    detail.isNotBlank() -> detail.take(220)
                    else -> "Cloud request failed ($code). Check your Supabase settings."
                }
            )
        }
        return text
    } finally {
        connection.disconnect()
    }
}


internal suspend fun requestEmailOtp(
    projectUrl: String,
    anonKey: String,
    email: String,
    createAccount: Boolean
) = withContext(Dispatchers.IO) {
    val base = projectUrl.trim().trimEnd('/')
    require(base.startsWith("https://", ignoreCase = true)) { "Use the HTTPS URL of your Supabase project." }
    require(anonKey.trim().isNotBlank()) { "Enter the public publishable key." }
    require(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(email.trim())) { "Enter a valid email address." }
    requestJson(
        "$base/auth/v1/otp", "POST", anonKey.trim(),
        body = JSONObject().put("email", email.trim().lowercase()).put("create_user", createAccount).toString()
    )
}

internal suspend fun verifyEmailOtp(
    projectUrl: String,
    anonKey: String,
    email: String,
    code: String
): String = withContext(Dispatchers.IO) {
    val base = projectUrl.trim().trimEnd('/')
    require(base.startsWith("https://", ignoreCase = true)) { "Use the HTTPS URL of your Supabase project." }
    require(anonKey.trim().isNotBlank()) { "Enter the public publishable key." }
    require(Regex("^[0-9]{6}$").matches(code.trim())) { "Enter the six-digit code from your email." }
    val raw = requestJson(
        "$base/auth/v1/verify", "POST", anonKey.trim(),
        body = JSONObject()
            .put("email", email.trim().lowercase())
            .put("token", code.trim())
            .put("type", "email")
            .toString()
    )
    val session = JSONObject(raw)
    val refresh = session.optString("refresh_token")
    val access = session.optString("access_token")
    val user = session.optJSONObject("user")
    if (refresh.isBlank() || access.isBlank() || user?.optString("id").isNullOrBlank()) {
        throw IllegalStateException("Email confirmed, but no active session was returned. Request a fresh code and try again.")
    }
    LinkaTokenVault.encrypt(refresh)
}

internal suspend fun approveQrPairing(
    projectUrl: String,
    anonKey: String,
    encryptedRefreshToken: String,
    pairingId: String,
    pairingSecret: String
): String = withContext(Dispatchers.IO) {
    val base = projectUrl.trim().trimEnd('/')
    require(base.startsWith("https://", ignoreCase = true)) { "Use the HTTPS URL of your Supabase project." }
    require(anonKey.trim().isNotBlank()) { "Enter the public publishable key." }
    require(pairingId.isNotBlank() && pairingSecret.length >= 32) { "The QR sign-in request is invalid." }
    val oldRefresh = runCatching { LinkaTokenVault.decrypt(encryptedRefreshToken) }
        .getOrElse { throw IllegalStateException("Sign in to Linka again before approving QR login.") }
    val session = JSONObject(requestJson(
        "$base/auth/v1/token?grant_type=refresh_token", "POST", anonKey.trim(),
        body = JSONObject().put("refresh_token", oldRefresh).toString()
    ))
    val access = session.optString("access_token")
    val refreshed = session.optString("refresh_token")
    if (access.isBlank() || refreshed.isBlank()) throw IllegalStateException("The Linka session expired. Sign in again.")
    requestJson(
        "$base/functions/v1/linka-pairing", "POST", anonKey.trim(), access,
        JSONObject().put("action", "approve").put("id", pairingId)
            .put("secret", pairingSecret).put("refreshToken", refreshed).toString()
    )
    LinkaTokenVault.encrypt(refreshed)
}


private fun captureArray(captures: List<Capture>): JSONArray = JSONArray().also { array ->
    captures.forEach { c ->
        array.put(JSONObject()
            .put("id", c.id)
            .put("text", c.text)
            .put("createdAt", c.createdAt)
            .put("updatedAt", c.updatedAt)
            .put("pinned", c.pinned)
            .put("previewTitle", c.previewTitle)
            .put("previewDescription", c.previewDescription)
            .put("previewImageUrl", c.previewImageUrl))
    }
}

private fun parseCaptureArray(array: JSONArray): List<Capture> = (0 until array.length()).mapNotNull { i ->
    val obj = array.optJSONObject(i) ?: return@mapNotNull null
    val text = obj.optString("text", "").trim().take(MAX_CAPTURE_CHARS)
    val created = obj.optLong("createdAt", 0L)
    if (text.isBlank() || created <= 0L) null else Capture(
        obj.optString("id").ifBlank { java.util.UUID.randomUUID().toString() },
        text,
        created,
        obj.optLong("updatedAt", created),
        obj.optBoolean("pinned", false),
        obj.optString("previewTitle", ""),
        obj.optString("previewDescription", ""),
        obj.optString("previewImageUrl", "")
    )
}

internal suspend fun syncWithSupabase(
    projectUrl: String,
    anonKey: String,
    email: String,
    password: String,
    createAccount: Boolean,
    localCaptures: List<Capture>,
    localDeletedIds: Set<String>,
    encryptedRefreshToken: String,
    localProfile: JSONObject? = null
): CloudSyncResult = withContext(Dispatchers.IO) {
    val base = projectUrl.trim().trimEnd('/')
    require(base.startsWith("https://", ignoreCase = true)) {
        "Use the HTTPS URL of your Supabase project."
    }
    require(anonKey.trim().isNotBlank()) { "Enter your Supabase publishable/anon key." }
    require(email.trim().contains("@")) { "Enter a valid email address." }

    val key = anonKey.trim()
    val sessionJson = when {
        encryptedRefreshToken.isNotBlank() -> {
            val refresh = runCatching { LinkaTokenVault.decrypt(encryptedRefreshToken) }
                .getOrElse { throw IllegalStateException("Sync session expired. Sign in again.") }
            requestJson(
                "$base/auth/v1/token?grant_type=refresh_token", "POST", key,
                body = JSONObject().put("refresh_token", refresh).toString()
            )
        }
        createAccount -> requestJson(
            "$base/auth/v1/signup", "POST", key,
            body = JSONObject().put("email", email.trim()).put("password", password).toString()
        )
        else -> requestJson(
            "$base/auth/v1/token?grant_type=password", "POST", key,
            body = JSONObject().put("email", email.trim()).put("password", password).toString()
        )
    }

    val sessionObject = JSONObject(sessionJson)
    val accessToken = sessionObject.optString("access_token")
    val refreshToken = sessionObject.optString("refresh_token")
    val userId = sessionObject.optJSONObject("user")?.optString("id")
        ?.takeIf { it.isNotBlank() }
        ?: sessionObject.optString("id").takeIf { it.isNotBlank() }
    if (accessToken.isBlank() || refreshToken.isBlank() || userId.isNullOrBlank()) {
        throw IllegalStateException(
            if (createAccount) "Account created. Confirm the email if prompted, then sign in to start syncing."
            else "No active session was returned. Confirm your email address and sign in again."
        )
    }

    val remoteResponse = requestJson(
        "$base/rest/v1/linka_sync?user_id=eq.$userId&select=data",
        "GET", key, accessToken
    )
    val row = runCatching { JSONArray(remoteResponse).optJSONObject(0) }.getOrNull()
    val remoteData = row?.optJSONObject("data")
    val remoteCaptures = remoteData?.optJSONArray("captures")?.let(::parseCaptureArray).orEmpty()
    val deleted = linkedSetOf<String>().apply {
        addAll(localDeletedIds)
        remoteData?.optJSONArray("deletedIds")?.let { array ->
            for (i in 0 until array.length()) array.optString(i).takeIf { it.isNotBlank() }?.let(::add)
        }
    }.toList().takeLast(5000).toSet()
    val remoteProfile = remoteData?.optJSONObject("profile")
    val validLocalProfile = localProfile?.takeIf { it.optString("displayName").isNotBlank() }
    val syncedProfile = when {
        validLocalProfile == null -> remoteProfile
        remoteProfile == null -> validLocalProfile
        validLocalProfile.optLong("updatedAt", 0L) >= remoteProfile.optLong("updatedAt", 0L) -> validLocalProfile
        else -> remoteProfile
    }

    val merged = (remoteCaptures + localCaptures)
        .filterNot { it.id in deleted }
        .groupBy { it.id }
        .values.map { copies -> copies.maxByOrNull { it.updatedAt }!! }
        .sortedWith(compareByDescending<Capture> { it.pinned }.thenByDescending { it.updatedAt })
        .take(MAX_CAPTURES)

    val data = JSONObject().put("captures", captureArray(merged)).put("deletedIds", JSONArray(deleted))
    if (syncedProfile != null) data.put("profile", syncedProfile)
    val upsert = JSONObject().put("user_id", userId).put("data", data).put("updated_at", Instant.now().toString())
    requestJson(
        "$base/rest/v1/linka_sync?on_conflict=user_id",
        "POST", key, accessToken, upsert.toString(), "resolution=merge-duplicates,return=minimal"
    )

    CloudSyncResult(
        captures = merged,
        deletedIds = deleted,
        encryptedRefreshToken = LinkaTokenVault.encrypt(refreshToken),
        message = "Synced ${merged.size} items",
        profile = syncedProfile
    )
}

internal val CLOUD_SYNC_SETUP_SQL = """
    create table if not exists public.linka_sync (
        user_id uuid primary key references auth.users(id) on delete cascade,
        data jsonb not null default '{"captures":[],"deletedIds":[]}'::jsonb,
        updated_at timestamptz not null default now()
    );
    alter table public.linka_sync enable row level security;
    grant select, insert, update, delete on public.linka_sync to authenticated;
    drop policy if exists "linka_sync_own_data" on public.linka_sync;
    create policy "linka_sync_own_data"
        on public.linka_sync for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
""".trimIndent()
