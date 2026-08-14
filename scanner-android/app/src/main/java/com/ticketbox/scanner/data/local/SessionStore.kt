package com.ticketbox.scanner.data.local

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

class SessionStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("ticketbox_scanner_native", Context.MODE_PRIVATE)

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
            prefs.edit().putString(KEY_ACCESS_TOKEN, value).apply()
        }

    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(value) {
            prefs.edit().putString(KEY_USER_ID, value).apply()
        }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_USER_ID)
            .apply()
    }

    internal fun sharedPreferences(): SharedPreferences = prefs

    private companion object {
        const val KEY_DEVICE_ID = "deviceId"
        const val KEY_API_BASE_URL = "apiBaseUrl"
        const val KEY_ACCESS_TOKEN = "accessToken"
        const val KEY_USER_ID = "userId"
        const val DEFAULT_API_BASE_URL = "http://192.168.1.5:3000/api/v1"
    }
}
