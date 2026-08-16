package com.ticketbox.scanner.data.local

import com.ticketbox.scanner.data.model.OfflineScan
import com.ticketbox.scanner.data.model.SyncedScanHistory
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

class OfflineScanStore(private val sessionStore: SessionStore) {
    fun load(): MutableList<OfflineScan> {
        val raw = sessionStore.sharedPreferences().getString(KEY_OFFLINE_QUEUE, "[]") ?: "[]"
        return try {
            val array = JSONArray(raw)
            val result = mutableListOf<OfflineScan>()
            for (index in 0 until array.length()) {
                val item = array.getJSONObject(index)
                result.add(
                    OfflineScan(
                        localId = item.getString("localId"),
                        ticketId = item.getString("ticketId"),
                        concertId = item.getString("concertId"),
                        gateId = item.getString("gateId"),
                        deviceId = item.getString("deviceId"),
                        staffId = item.getString("staffId"),
                        scannedAtLocal = item.getString("scannedAtLocal"),
                        syncStatus = item.getString("syncStatus"),
                        lastError = item.optString("lastError").ifBlank { null },
                        customerName = item.optString("customerName").ifBlank { null },
                        customerEmail = item.optString("customerEmail").ifBlank { null },
                        customerPhone = item.optString("customerPhone").ifBlank { null },
                        customerCompany = item.optString("customerCompany").ifBlank { null }
                    )
                )
            }
            result
        } catch (_: JSONException) {
            mutableListOf()
        }
    }

    fun save(queue: List<OfflineScan>) {
        val array = JSONArray()
        queue.forEach {
            array.put(
                JSONObject()
                    .put("localId", it.localId)
                    .put("ticketId", it.ticketId)
                    .put("concertId", it.concertId)
                    .put("gateId", it.gateId)
                    .put("deviceId", it.deviceId)
                    .put("staffId", it.staffId)
                    .put("scannedAtLocal", it.scannedAtLocal)
                    .put("syncStatus", it.syncStatus)
                    .put("lastError", it.lastError)
                    .put("customerName", it.customerName)
                    .put("customerEmail", it.customerEmail)
                    .put("customerPhone", it.customerPhone)
                    .put("customerCompany", it.customerCompany)
            )
        }
        sessionStore.sharedPreferences().edit().putString(KEY_OFFLINE_QUEUE, array.toString()).apply()
    }

    fun loadSyncedHistory(): MutableList<SyncedScanHistory> {
        val raw = sessionStore.sharedPreferences().getString(KEY_SYNCED_HISTORY, "[]") ?: "[]"
        return try {
            val array = JSONArray(raw)
            val result = mutableListOf<SyncedScanHistory>()
            for (index in 0 until array.length()) {
                val item = array.getJSONObject(index)
                result.add(
                    SyncedScanHistory(
                        localId = item.getString("localId"),
                        ticketId = item.getString("ticketId"),
                        concertId = item.getString("concertId"),
                        concertName = item.optString("concertName").ifBlank { "Concert" },
                        gateId = item.getString("gateId"),
                        deviceId = item.getString("deviceId"),
                        staffId = item.getString("staffId"),
                        scannedAtLocal = item.getString("scannedAtLocal"),
                        syncedAt = item.getString("syncedAt")
                    )
                )
            }
            result
        } catch (_: JSONException) {
            mutableListOf()
        }
    }

    fun saveSyncedHistory(history: List<SyncedScanHistory>) {
        val array = JSONArray()
        history.forEach {
            array.put(
                JSONObject()
                    .put("localId", it.localId)
                    .put("ticketId", it.ticketId)
                    .put("concertId", it.concertId)
                    .put("concertName", it.concertName)
                    .put("gateId", it.gateId)
                    .put("deviceId", it.deviceId)
                    .put("staffId", it.staffId)
                    .put("scannedAtLocal", it.scannedAtLocal)
                    .put("syncedAt", it.syncedAt)
            )
        }
        sessionStore.sharedPreferences().edit().putString(KEY_SYNCED_HISTORY, array.toString()).apply()
    }

    fun appendSyncedHistory(items: List<SyncedScanHistory>, maxItems: Int): MutableList<SyncedScanHistory> {
        val nextHistory = (items + loadSyncedHistory())
            .distinctBy { it.localId }
            .take(maxItems)
            .toMutableList()
        saveSyncedHistory(nextHistory)
        return nextHistory
    }

    private companion object {
        const val KEY_OFFLINE_QUEUE = "offlineQueue"
        const val KEY_SYNCED_HISTORY = "syncedScanHistory"
    }
}
