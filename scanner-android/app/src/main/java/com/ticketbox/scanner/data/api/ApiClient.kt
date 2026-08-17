package com.ticketbox.scanner.data.api

import com.ticketbox.scanner.data.model.AssignedConcert
import com.ticketbox.scanner.data.model.OfflineScan
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URL

data class LoginSession(
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: String?,
    val userId: String,
    val role: String
)

data class OfflineSyncConflict(
    val ticketId: String,
    val scannedAtLocal: String,
    val reason: String,
    val customer: JSONObject?
) {
    val key: String = "$ticketId|$scannedAtLocal"
}

data class OfflineSyncResult(
    val syncedCount: Int,
    val conflictCount: Int,
    val conflicts: Map<String, OfflineSyncConflict>
)

class ApiException(
    val statusCode: Int,
    override val message: String
) : Exception(message)

class NetworkException(
    override val message: String,
    override val cause: Throwable? = null
) : Exception(message, cause)

class ApiClient(val baseUrl: String) {
    private val client = OkHttpClient()
    private val mediaType = "application/json; charset=utf-8".toMediaType()

    fun login(email: String, password: String): LoginSession {
        val body = JSONObject()
            .put("email", email)
            .put("password", password)
        val data = request("/auth/login", "POST", body, null) as JSONObject
        val user = data.getJSONObject("user")
        return LoginSession(
            accessToken = data.getString("accessToken"),
            refreshToken = data.optString("refreshToken", ""),
            expiresAt = data.optString("expiresAt").ifBlank { null },
            userId = user.getString("id"),
            role = user.getString("role")
        )
    }

    fun refresh(refreshToken: String): LoginSession {
        val body = JSONObject().put("refreshToken", refreshToken)
        val data = request("/auth/refresh", "POST", body, null) as JSONObject
        val user = data.getJSONObject("user")
        return LoginSession(
            accessToken = data.getString("accessToken"),
            refreshToken = data.optString("refreshToken", ""),
            expiresAt = data.optString("expiresAt").ifBlank { null },
            userId = user.getString("id"),
            role = user.getString("role")
        )
    }

    fun listAssignedConcerts(token: String): List<AssignedConcert> {
        val data = request("/checkins/concerts", "GET", null, token) as JSONArray
        val result = mutableListOf<AssignedConcert>()
        for (index in 0 until data.length()) {
            val item = data.getJSONObject(index)
            val gateIds = item.optJSONArray("gateIds") ?: JSONArray()
            result.add(
                AssignedConcert(
                    id = item.getString("id"),
                    name = item.optString("name", "Concert"),
                    venue = item.optString("venue", ""),
                    startAt = item.optString("startAt", ""),
                    gateIds = (0 until gateIds.length()).map { gateIds.getString(it) }
                )
            )
        }
        return result
    }

    fun scanTicket(
        token: String,
        concertId: String,
        gateId: String,
        qrCode: String,
        deviceId: String,
        scannedAt: String
    ): JSONObject {
        val body = JSONObject()
            .put("qrCode", qrCode)
            .put("ticketId", qrCode)
            .put("concertId", concertId)
            .put("gateId", gateId)
            .put("deviceId", deviceId)
            .put("scannedAt", scannedAt)
            .put("scannedAtLocal", scannedAt)
        return request("/checkins/scan", "POST", body, token) as JSONObject
    }

    fun syncOfflineScans(
        token: String,
        concertId: String,
        deviceId: String,
        scans: List<OfflineScan>
    ): OfflineSyncResult {
        val logs = JSONArray()
        scans.forEach {
            logs.put(
                JSONObject()
                    .put("ticketId", it.ticketId)
                    .put("scannedAtLocal", it.scannedAtLocal)
            )
        }

        val body = JSONObject()
            .put("concertId", concertId)
            .put("deviceId", deviceId)
            .put("logs", logs)
        val data = request("/checkins/sync", "POST", body, token) as JSONObject
        val conflicts = mutableMapOf<String, OfflineSyncConflict>()
        val conflictArray = data.optJSONArray("conflicts") ?: JSONArray()
        for (index in 0 until conflictArray.length()) {
            val item = conflictArray.getJSONObject(index)
            val conflict = OfflineSyncConflict(
                ticketId = item.getString("ticketId"),
                scannedAtLocal = item.getString("scannedAtLocal"),
                reason = item.optString("reason", "Conflict"),
                customer = item.optJSONObject("customer")
            )
            conflicts[conflict.key] = conflict
        }

        return OfflineSyncResult(
            syncedCount = data.optInt("syncedCount"),
            conflictCount = data.optInt("conflictCount"),
            conflicts = conflicts
        )
    }

    private fun request(path: String, method: String, body: JSONObject?, token: String?): Any {
        val builder = Request.Builder()
            .url("$baseUrl$path")
            .addHeader("Content-Type", "application/json")

        if (!token.isNullOrBlank()) {
            builder.addHeader("Authorization", "Bearer $token")
        }

        when (method.uppercase()) {
            "GET" -> builder.get()
            "POST" -> builder.post((body ?: JSONObject()).toString().toRequestBody(mediaType))
            else -> throw IllegalArgumentException("Phương thức không hỗ trợ: $method")
        }

        try {
            client.newCall(builder.build()).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                val payload = if (raw.isBlank()) JSONObject() else JSONObject(raw)
                if (!response.isSuccessful || payload.optBoolean("success") == false) {
                    val errorMessage = payload.optJSONObject("error")?.optString("message")
                        ?: payload.optString("message")
                        ?: "Request failed (${response.code})"
                    throw ApiException(response.code, errorMessage)
                }
                return payload.opt("data") ?: JSONObject()
            }
        } catch (error: IOException) {
            throw NetworkException("Không kết nối được backend.", error)
        }
    }
}

fun normalizeBaseUrl(raw: String): String {
    var value = raw.trim()
    if (value.isBlank()) throw IllegalArgumentException("Vui lòng nhập API URL.")
    value = value.replace(Regex("^http:/*", RegexOption.IGNORE_CASE), "http://")
    value = value.replace(Regex("^https:/*", RegexOption.IGNORE_CASE), "https://")
    if (!value.startsWith("http://", true) && !value.startsWith("https://", true)) {
        value = "http://$value"
    }
    value = value.trimEnd('/')
    URL(value)
    return value
}
