package com.ticketbox.scanner

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.ticketbox.scanner.data.api.ApiClient
import com.ticketbox.scanner.data.api.ApiException
import com.ticketbox.scanner.data.api.NetworkException
import com.ticketbox.scanner.data.api.normalizeBaseUrl
import com.ticketbox.scanner.data.local.OfflineScanStore
import com.ticketbox.scanner.data.local.SessionStore
import com.ticketbox.scanner.data.model.AssignedConcert
import com.ticketbox.scanner.data.model.OfflineScan
import com.ticketbox.scanner.data.model.SyncedScanHistory
import com.ticketbox.scanner.scanner.CameraQrScanner
import com.ticketbox.scanner.ui.ScannerUiFactory
import com.ticketbox.scanner.ui.muted
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

class MainActivity : ComponentActivity() {
    private lateinit var sessionStore: SessionStore
    private lateinit var offlineScanStore: OfflineScanStore
    private lateinit var apiClient: ApiClient
    private lateinit var qrScanner: CameraQrScanner
    private lateinit var ui: ScannerUiFactory

    private lateinit var root: LinearLayout
    private lateinit var loginPanel: LinearLayout
    private lateinit var scannerPanel: LinearLayout
    private lateinit var apiUrlInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var statusText: TextView
    private lateinit var manualCodeInput: EditText
    private lateinit var concertSpinner: Spinner
    private lateinit var gateSpinner: Spinner
    private lateinit var queueText: TextView
    private lateinit var conflictListText: TextView
    private lateinit var syncedHistoryText: TextView
    private lateinit var resultText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var cameraContainer: LinearLayout
    private lateinit var previewView: PreviewView

    private var accessToken: String? = null
    private var userId: String? = null
    private var deviceId: String = ""
    private var concerts: List<AssignedConcert> = emptyList()
    private var selectedConcert: AssignedConcert? = null
    private var selectedGateId: String? = null
    private var offlineQueue: MutableList<OfflineScan> = mutableListOf()
    private var syncedHistory: MutableList<SyncedScanHistory> = mutableListOf()
    private var scanRequestInFlight = false

    private val requestCameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera() else toast("Cần cấp quyền camera để quét QR.")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        sessionStore = SessionStore(this)
        offlineScanStore = OfflineScanStore(sessionStore)
        ui = ScannerUiFactory(this)
        deviceId = sessionStore.deviceId
        accessToken = sessionStore.accessToken
        userId = sessionStore.userId
        apiClient = ApiClient(sessionStore.apiBaseUrl)
        offlineQueue = offlineScanStore.load()
        syncedHistory = offlineScanStore.loadSyncedHistory()

        buildUi()
        qrScanner = CameraQrScanner(this, previewView) { code -> submitScan(code) }
        renderSession()

        if (accessToken != null) {
            loadAssignedConcerts()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        qrScanner.release()
    }

    private fun buildUi() {
        val scroll = ScrollView(this).apply {
            setBackgroundColor(Color.rgb(241, 245, 249))
        }
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(ui.dp(20), ui.dp(24), ui.dp(20), ui.dp(32))
            setBackgroundColor(Color.rgb(241, 245, 249))
        }
        scroll.addView(root)
        setContentView(scroll)

        root.addView(ui.text("TicketBox Scanner", 26, true).apply {
            setTextColor(Color.rgb(15, 23, 42))
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(16), 0, ui.dp(4))
            }
        })
        root.addView(ui.text("Ứng dụng Android native cho nhân viên soát vé.", 14, false).muted().apply {
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, 0, 0, ui.dp(16))
            }
        })

        progressBar = ProgressBar(this).apply {
            visibility = View.GONE
            isIndeterminate = true
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(8), 0, ui.dp(8))
            }
        }
        root.addView(progressBar)

        statusText = ui.text("", 13, false).apply {
            setPadding(ui.dp(14), ui.dp(10), ui.dp(14), ui.dp(10))
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(4), 0, ui.dp(16))
            }
        }
        root.addView(statusText)

        buildLoginPanel()
        buildScannerPanel()
    }

    private fun buildLoginPanel() {
        loginPanel = ui.verticalPanel()
        apiUrlInput = ui.input("API URL, ví dụ: http://192.168.1.5:3000/api/v1", apiClient.baseUrl)
        emailInput = ui.input("Email nhân viên", "")
        passwordInput = ui.input("Mật khẩu", "").apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }

        loginPanel.addView(ui.label("API base URL"))
        loginPanel.addView(apiUrlInput)
        loginPanel.addView(ui.button("Lưu API URL") { saveApiUrl() })
        loginPanel.addView(ui.label("Đăng nhập"))
        loginPanel.addView(emailInput)
        loginPanel.addView(passwordInput)
        loginPanel.addView(ui.button("Đăng nhập") { login() })
        root.addView(loginPanel)
    }

    private fun buildScannerPanel() {
        scannerPanel = ui.verticalPanel()
        scannerPanel.addView(ui.button("Đăng xuất") { logout() })
        scannerPanel.addView(ui.label("Sự kiện được phân công"))

        concertSpinner = Spinner(this).apply {
            background = ui.borderedBackground(Color.rgb(248, 250, 252), Color.rgb(226, 232, 240))
            setPadding(ui.dp(14), ui.dp(12), ui.dp(14), ui.dp(12))
        }
        scannerPanel.addView(concertSpinner, LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, ui.dp(4), 0, ui.dp(12))
        })

        scannerPanel.addView(ui.label("Cổng soát vé"))
        gateSpinner = Spinner(this).apply {
            background = ui.borderedBackground(Color.rgb(248, 250, 252), Color.rgb(226, 232, 240))
            setPadding(ui.dp(14), ui.dp(12), ui.dp(14), ui.dp(12))
        }
        scannerPanel.addView(gateSpinner, LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, ui.dp(4), 0, ui.dp(12))
        })

        scannerPanel.addView(ui.button("Tải lại phân công") { loadAssignedConcerts() })

        resultText = ui.text("", 15, true).apply { visibility = View.GONE }
        scannerPanel.addView(resultText)

        manualCodeInput = ui.input("Dán QR token hoặc mã vé", "")
        scannerPanel.addView(ui.label("Nhập mã thủ công"))
        scannerPanel.addView(manualCodeInput)
        scannerPanel.addView(ui.button("Soát vé thủ công") { submitManualCode() })
        scannerPanel.addView(ui.button("Mở camera quét QR") { openCamera() })
        scannerPanel.addView(ui.button("Đóng camera") { stopCamera() })

        cameraContainer = ui.verticalPanel().apply {
            visibility = View.GONE
            setPadding(ui.dp(4), ui.dp(4), ui.dp(4), ui.dp(4))
        }
        previewView = PreviewView(this)
        cameraContainer.addView(previewView, ViewGroup.LayoutParams(ui.matchParent(), ui.dp(320)))
        scannerPanel.addView(cameraContainer)

        queueText = ui.text("", 13, false).apply {
            setPadding(ui.dp(12), ui.dp(8), ui.dp(12), ui.dp(8))
            background = ui.filledBackground(Color.rgb(241, 245, 249))
            setTextColor(Color.rgb(71, 85, 105))
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(12), 0, ui.dp(12))
            }
        }
        scannerPanel.addView(queueText)

        conflictListText = ui.text("", 13, false).apply {
            setPadding(ui.dp(14), ui.dp(12), ui.dp(14), ui.dp(12))
            background = ui.borderedBackground(Color.rgb(254, 242, 242), Color.rgb(254, 202, 202))
            setTextColor(Color.rgb(185, 28, 28))
            gravity = Gravity.LEFT
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(8), 0, ui.dp(12))
            }
            visibility = View.GONE
        }
        scannerPanel.addView(conflictListText)
        scannerPanel.addView(ui.button("Đồng bộ lượt ngoại tuyến") { syncOfflineQueue() })
        scannerPanel.addView(ui.button("Dọn lượt đã đồng bộ") { clearResolvedQueue() })
        scannerPanel.addView(ui.label("Lịch sử đồng bộ thành công"))
        syncedHistoryText = ui.text("", 13, false).apply {
            setPadding(ui.dp(14), ui.dp(12), ui.dp(14), ui.dp(12))
            background = ui.borderedBackground(Color.rgb(240, 253, 250), Color.rgb(167, 243, 208))
            setTextColor(Color.rgb(20, 83, 45))
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(4), 0, ui.dp(10))
            }
        }
        scannerPanel.addView(syncedHistoryText)
        scannerPanel.addView(ui.button("Xóa lịch sử đồng bộ") { clearSyncedHistory() })
        root.addView(scannerPanel)
    }

    private fun renderSession() {
        val loggedIn = accessToken != null
        loginPanel.visibility = if (loggedIn) View.GONE else View.VISIBLE
        scannerPanel.visibility = if (loggedIn) View.VISIBLE else View.GONE

        val online = hasNetworkConnection()
        statusText.text = if (loggedIn) {
            if (online) {
                "Đã đăng nhập. Thiết bị: $deviceId. Khi quét sẽ xác thực trực tiếp với backend."
            } else {
                "Đã đăng nhập. Thiết bị: $deviceId. Thiết bị đang ngoại tuyến; mã quét sẽ được lưu vào hàng đợi."
            }
        } else {
            "Chưa đăng nhập. Hãy nhập API URL bằng IP LAN của laptop."
        }

        val (bgCol, txtCol) = if (online) {
            Pair(Color.rgb(220, 252, 231), Color.rgb(21, 128, 61))
        } else {
            Pair(Color.rgb(254, 243, 199), Color.rgb(180, 83, 9))
        }
        statusText.background = ui.filledBackground(bgCol)
        statusText.setTextColor(txtCol)
        renderQueue()
    }

    private fun saveApiUrl(): Boolean {
        try {
            val normalized = normalizeBaseUrl(apiUrlInput.text.toString())
            apiClient = ApiClient(normalized)
            apiUrlInput.setText(normalized)
            sessionStore.apiBaseUrl = normalized
            toast("Đã lưu API URL.")
            return true
        } catch (error: Exception) {
            toast(error.message ?: "API URL không hợp lệ.")
            return false
        }
    }

    private fun login() {
        if (!saveApiUrl()) return
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (email.isBlank() || password.isBlank()) {
            toast("Vui lòng nhập email và mật khẩu.")
            return
        }

        launchBusy {
            val session = apiClient.login(email, password)
            if (session.role != "CHECKIN_STAFF") {
                throw ApiException(403, "Tài khoản này không có quyền soát vé.")
            }
            accessToken = session.accessToken
            userId = session.userId
            sessionStore.accessToken = session.accessToken
            sessionStore.userId = session.userId
            withContext(Dispatchers.Main) {
                renderSession()
                loadAssignedConcerts()
            }
        }
    }

    private fun logout() {
        stopCamera()
        accessToken = null
        userId = null
        concerts = emptyList()
        selectedConcert = null
        selectedGateId = null
        sessionStore.clearSession()
        renderSession()
    }

    private fun loadAssignedConcerts() {
        val token = accessToken ?: return
        launchBusy {
            val nextConcerts = apiClient.listAssignedConcerts(token)
            withContext(Dispatchers.Main) {
                concerts = nextConcerts
                selectedConcert = concerts.firstOrNull()
                selectedGateId = selectedConcert?.gateIds?.firstOrNull()
                renderConcertSpinners()
                toast("Đã tải ${concerts.size} sự kiện.")
            }
        }
    }

    private fun renderConcertSpinners() {
        val concertLabels = concerts.map { "${it.name} - ${it.venue}" }
        concertSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, concertLabels)
        concertSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedConcert = concerts.getOrNull(position)
                selectedGateId = selectedConcert?.gateIds?.firstOrNull()
                renderGateSpinner()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
        renderGateSpinner()
    }

    private fun renderGateSpinner() {
        val gates = selectedConcert?.gateIds ?: emptyList()
        gateSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, gates)
        gateSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedGateId = gates.getOrNull(position)
            }

            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
    }

    private fun submitManualCode() {
        val code = manualCodeInput.text.toString()
        manualCodeInput.setText("")
        submitScan(code)
    }

    private fun submitScan(rawCode: String) {
        val qrCode = rawCode.trim()
        val concertId = selectedConcert?.id
        val gateId = selectedGateId
        val token = accessToken
        if (qrCode.isBlank() || concertId.isNullOrBlank() || gateId.isNullOrBlank() || token == null) {
            toast("Cần chọn sự kiện/cổng soát vé và nhập mã vé.")
            return
        }

        if (scanRequestInFlight) return

        if (!hasNetworkConnection()) {
            enqueueOffline(qrCode, "Thiết bị đang ngoại tuyến.")
            return
        }

        scanRequestInFlight = true
        launchBusy {
            try {
                val data = apiClient.scanTicket(
                    token = token,
                    concertId = concertId,
                    gateId = gateId,
                    qrCode = qrCode,
                    deviceId = deviceId,
                    scannedAt = Instant.now().toString()
                )
                withContext(Dispatchers.Main) { renderScanResult(data) }
            } catch (error: NetworkException) {
                withContext(Dispatchers.Main) {
                    renderError(
                        "Không kết nối được backend để xác thực trực tiếp. " +
                            "Kiểm tra API URL, backend đang chạy, và điện thoại cùng Wi-Fi với laptop."
                    )
                }
            } finally {
                withContext(Dispatchers.Main) {
                    scanRequestInFlight = false
                }
            }
        }
    }

    private fun renderScanResult(data: JSONObject) {
        val status = data.optString("status", "INVALID_TICKET")
        var resultMsg = when (status) {
            "VALID" -> "Hợp lệ: Đã check-in thành công."
            "ALREADY_USED" -> "Vé đã được sử dụng trước đó."
            "WRONG_CONCERT" -> "Sai sự kiện."
            "WRONG_DATE" -> "Sai ngày diễn."
            "CANCELLED" -> "Vé/khách mời đã bị hủy."
            "INVALID_SCAN_TIME" -> "Thời gian quét không hợp lệ."
            else -> "Vé không hợp lệ."
        }

        val customer = data.optJSONObject("customer")
        if (customer != null) {
            val name = customer.optString("name")
            val email = customer.optString("email")
            val company = customer.optString("company")
            val vipStr = if (!company.isNullOrBlank() && company != "null") " (VIP - $company)" else ""
            resultMsg += "\nKhách: $name (${if (email.isNullOrBlank() || email == "null") "N/A" else email})$vipStr"
        }

        val (bgCol, strokeCol, txtCol) = if (status == "VALID") {
            Triple(Color.rgb(240, 253, 250), Color.rgb(187, 247, 208), Color.rgb(21, 128, 61))
        } else {
            Triple(Color.rgb(254, 242, 242), Color.rgb(254, 202, 202), Color.rgb(185, 28, 28))
        }
        resultText.apply {
            text = resultMsg
            setTextColor(txtCol)
            background = ui.borderedBackground(bgCol, strokeCol)
            setPadding(ui.dp(16), ui.dp(14), ui.dp(16), ui.dp(14))
            gravity = Gravity.CENTER_HORIZONTAL
            visibility = View.VISIBLE
            layoutParams = LinearLayout.LayoutParams(ui.matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, ui.dp(12), 0, ui.dp(16))
            }
        }
    }

    private fun renderError(message: String) {
        resultText.apply {
            text = message
            setTextColor(Color.rgb(185, 28, 28))
            background = ui.borderedBackground(Color.rgb(254, 242, 242), Color.rgb(254, 202, 202))
            setPadding(ui.dp(16), ui.dp(14), ui.dp(16), ui.dp(14))
            gravity = Gravity.CENTER_HORIZONTAL
            visibility = View.VISIBLE
        }
    }

    private fun enqueueOffline(ticketId: String, reason: String) {
        val concertId = selectedConcert?.id ?: return
        val gateId = selectedGateId ?: return
        val staffId = userId ?: return
        offlineQueue.add(
            0,
            OfflineScan(
                localId = UUID.randomUUID().toString(),
                ticketId = ticketId,
                concertId = concertId,
                gateId = gateId,
                deviceId = deviceId,
                staffId = staffId,
                scannedAtLocal = Instant.now().toString(),
                syncStatus = "PENDING",
                lastError = reason
            )
        )
        if (offlineQueue.size > MAX_OFFLINE_QUEUE_SIZE) {
            offlineQueue = offlineQueue.take(MAX_OFFLINE_QUEUE_SIZE).toMutableList()
        }
        offlineScanStore.save(offlineQueue)
        resultText.apply {
            text = "Đã lưu lượt quét vào hàng đợi ngoại tuyến."
            setTextColor(Color.rgb(180, 83, 9))
            background = ui.borderedBackground(Color.rgb(254, 243, 199), Color.rgb(252, 211, 77))
            setPadding(ui.dp(16), ui.dp(14), ui.dp(16), ui.dp(14))
            gravity = Gravity.CENTER_HORIZONTAL
            visibility = View.VISIBLE
        }
        renderQueue()
    }

    private fun syncOfflineQueue() {
        val token = accessToken ?: return
        val concertId = selectedConcert?.id ?: return
        val gateId = selectedGateId ?: return
        val staffId = userId ?: return
        val pending = offlineQueue.filter {
            it.syncStatus == "PENDING" &&
                it.concertId == concertId &&
                it.gateId == gateId &&
                it.deviceId == deviceId &&
                it.staffId == staffId
        }
        if (pending.isEmpty()) {
            toast("Không có lượt quét ngoại tuyến cần đồng bộ.")
            return
        }

        launchBusy {
            val result = apiClient.syncOfflineScans(token, concertId, deviceId, pending)
            val syncedAt = Instant.now().toString()
            val syncedItems = pending
                .filter { item -> result.conflicts["${item.ticketId}|${item.scannedAtLocal}"] == null }
                .map { item ->
                    SyncedScanHistory(
                        localId = item.localId,
                        ticketId = item.ticketId,
                        concertId = item.concertId,
                        concertName = selectedConcert?.name ?: "Concert",
                        gateId = item.gateId,
                        deviceId = item.deviceId,
                        staffId = item.staffId,
                        scannedAtLocal = item.scannedAtLocal,
                        syncedAt = syncedAt
                    )
                }
            offlineQueue = offlineQueue.map { item ->
                if (pending.none { it.localId == item.localId }) {
                    item
                } else {
                    val conflict = result.conflicts["${item.ticketId}|${item.scannedAtLocal}"]
                    if (conflict == null) {
                        item.copy(syncStatus = "SYNCED", lastError = null)
                    } else {
                        val customer = conflict.customer
                        item.copy(
                            syncStatus = "CONFLICT",
                            lastError = conflict.reason,
                            customerName = customer?.optString("name"),
                            customerEmail = customer?.optString("email"),
                            customerPhone = customer?.optString("phone"),
                            customerCompany = customer?.optString("company")
                        )
                    }
                }
            }.toMutableList()
            offlineScanStore.save(offlineQueue)
            if (syncedItems.isNotEmpty()) {
                syncedHistory = offlineScanStore.appendSyncedHistory(syncedItems, MAX_SYNC_HISTORY_SIZE)
            }

            withContext(Dispatchers.Main) {
                renderQueue()
                toast("Đồng bộ xong: ${result.syncedCount} thành công, ${result.conflictCount} xung đột.")
            }
        }
    }

    private fun clearResolvedQueue() {
        offlineQueue = offlineQueue.filter { it.syncStatus == "PENDING" || it.syncStatus == "CONFLICT" }.toMutableList()
        offlineScanStore.save(offlineQueue)
        renderQueue()
    }

    private fun clearSyncedHistory() {
        syncedHistory = mutableListOf()
        offlineScanStore.saveSyncedHistory(syncedHistory)
        renderSyncedHistory()
        toast("Đã xóa lịch sử đồng bộ thành công.")
    }

    private fun renderQueue() {
        val pending = offlineQueue.count { it.syncStatus == "PENDING" }
        val conflict = offlineQueue.count { it.syncStatus == "CONFLICT" }
        queueText.text = "Hàng đợi ngoại tuyến: đang chờ $pending lượt, xung đột $conflict lượt."
        renderSyncedHistory()

        val conflicts = offlineQueue.filter { it.syncStatus == "CONFLICT" }
        if (conflicts.isEmpty()) {
            conflictListText.visibility = View.GONE
            conflictListText.text = ""
            return
        }

        conflictListText.visibility = View.VISIBLE
        val details = StringBuilder("Chi tiết vé xung đột:\n")
        conflicts.forEachIndexed { idx, item ->
            details.append("${idx + 1}. Vé: ${item.ticketId}\n")
            if (item.customerName != null) {
                val company = item.customerCompany
                val vipStr = if (!company.isNullOrBlank() && company != "null") " (VIP - $company)" else ""
                details.append("   Khách: ${item.customerName} (${item.customerEmail ?: "N/A"})$vipStr\n")
            }
            details.append("   Lỗi: ${item.lastError ?: "Không rõ lý do"}\n")
        }
        conflictListText.text = details.toString()
    }

    private fun renderSyncedHistory() {
        if (!::syncedHistoryText.isInitialized) return
        if (syncedHistory.isEmpty()) {
            syncedHistoryText.text = "Chưa có lượt đồng bộ thành công."
            return
        }

        val details = StringBuilder("Đã đồng bộ thành công ${syncedHistory.size} lượt gần nhất:\n")
        syncedHistory.take(SYNC_HISTORY_DISPLAY_LIMIT).forEachIndexed { index, item ->
            details.append("${index + 1}. Vé: ${shortCode(item.ticketId)} · ${item.concertName}\n")
            details.append("   Cổng: ${item.gateId} · Quét: ${formatCompactTime(item.scannedAtLocal)} · Sync: ${formatCompactTime(item.syncedAt)}\n")
        }
        if (syncedHistory.size > SYNC_HISTORY_DISPLAY_LIMIT) {
            details.append("... còn ${syncedHistory.size - SYNC_HISTORY_DISPLAY_LIMIT} lượt khác.")
        }
        syncedHistoryText.text = details.toString()
    }

    private fun shortCode(value: String): String {
        return if (value.length <= 12) value else "${value.take(6)}...${value.takeLast(4)}"
    }

    private fun formatCompactTime(value: String): String {
        return value
            .replace("T", " ")
            .replace(Regex("\\.\\d+Z$"), "Z")
            .take(19)
    }

    private fun openCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        cameraContainer.visibility = View.VISIBLE
        qrScanner.start()
    }

    private fun stopCamera() {
        cameraContainer.visibility = View.GONE
        qrScanner.stop()
    }

    private fun launchBusy(block: suspend () -> Unit) {
        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { block() }
            } catch (error: ApiException) {
                if (error.statusCode == 401 || error.statusCode == 403) {
                    logout()
                }
                renderError(error.message)
            } catch (error: NetworkException) {
                renderError(error.message ?: "Không kết nối được backend.")
            } catch (error: Exception) {
                renderError(error.message ?: "Có lỗi xảy ra.")
            } finally {
                progressBar.visibility = View.GONE
                renderSession()
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun hasNetworkConnection(): Boolean {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = manager.activeNetwork
        if (network != null) {
            val capabilities = manager.getNetworkCapabilities(network) ?: return true
            return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) ||
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        }
        return manager.activeNetworkInfo?.isConnectedOrConnecting == true
    }

    private fun toast(message: String) {
        runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
    }

    private companion object {
        const val MAX_OFFLINE_QUEUE_SIZE = 500
        const val MAX_SYNC_HISTORY_SIZE = 50
        const val SYNC_HISTORY_DISPLAY_LIMIT = 10
    }
}
