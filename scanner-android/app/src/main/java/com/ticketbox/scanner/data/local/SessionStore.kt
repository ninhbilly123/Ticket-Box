package com.ticketbox.scanner.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.UUID

class SessionStore(context: Context) {
    private val plainPrefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val prefs: SharedPreferences =
        runCatching {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                SECURE_PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        }.getOrElse {
            context.getSharedPreferences(SECURE_FALLBACK_PREFS_NAME, Context.MODE_PRIVATE)
        }.also { securePrefs ->
            migratePlainPreferences(plainPrefs, securePrefs)
        }

    val deviceId: String
        get() {
            val existing = prefs.getString(KEY_DEVICE_ID, null)
            if (!existing.isNullOrBlank()) return existing

            val created = "android-${UUID.randomUUID().toString().take(8)}"
            prefs.edit().putString(KEY_DEVICE_ID, created).apply()
            return created
        }

    var apiBaseUrl: String
        get() = prefs.getString(KEY_API_BASE_URL, DEFAULT_API_BASE_URL) ?: DEFAULT_API_BASE_URL
        set(value) {
            prefs.edit().putString(KEY_API_BASE_URL, value).apply()
        }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS_TOKEN, null)
        set(value) {
            if (value == null) {
                prefs.edit().remove(KEY_ACCESS_TOKEN).apply()
            } else {
                prefs.edit().putString(KEY_ACCESS_TOKEN, value).apply()
            }
        }

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH_TOKEN, null)
        set(value) {
            if (value == null) {
                prefs.edit().remove(KEY_REFRESH_TOKEN).apply()
            } else {
                prefs.edit().putString(KEY_REFRESH_TOKEN, value).apply()
            }
        }

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) {
            if (value == null) {
                prefs.edit().remove(KEY_USER_ID).apply()
            } else {
                prefs.edit().putString(KEY_USER_ID, value).apply()
            }
        }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_ID)
            .apply()
    }

    internal fun sharedPreferences(): SharedPreferences = prefs

    private fun migratePlainPreferences(source: SharedPreferences, target: SharedPreferences) {
        val editor = target.edit()
        var changed = false
        source.all.forEach { (key, value) ->
            if (!target.contains(key) && value is String) {
                editor.putString(key, value)
                changed = true
            }
        }
        if (changed) editor.apply()
    }

    private companion object {
        const val PREFS_NAME = "ticketbox_scanner_native"
        const val SECURE_PREFS_NAME = "ticketbox_scanner_native_secure"
        const val SECURE_FALLBACK_PREFS_NAME = "ticketbox_scanner_native_secure_fallback"
        const val KEY_DEVICE_ID = "deviceId"
        const val KEY_API_BASE_URL = "apiBaseUrl"
        const val KEY_ACCESS_TOKEN = "accessToken"
        const val KEY_REFRESH_TOKEN = "refreshToken"
        const val KEY_USER_ID = "userId"
        const val DEFAULT_API_BASE_URL = "http://192.168.1.5:3000/api/v1"
    }
}
