package com.ticketbox.scanner.data.model

data class OfflineScan(
    val localId: String,
    val ticketId: String,
    val concertId: String,
    val gateId: String,
    val deviceId: String,
    val staffId: String,
    val scannedAtLocal: String,
    val syncStatus: String,
    val lastError: String?,
    val customerName: String? = null,
    val customerEmail: String? = null,
    val customerPhone: String? = null,
    val customerCompany: String? = null
)
