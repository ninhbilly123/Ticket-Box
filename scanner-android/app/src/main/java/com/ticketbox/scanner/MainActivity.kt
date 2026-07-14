package com.ticketbox.scanner

import android.Manifest
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import java.time.Instant
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private lateinit var prefs: SharedPreferences
    private lateinit var apiClient: ApiClient

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
    private lateinit var resultText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var cameraContainer: LinearLayout
    private lateinit var previewView: PreviewView

    private val scanner = BarcodeScanning.getClient()
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private var scanLocked = false
    private var cameraActive = false

    private var accessToken: String? = null
    private var userId: String? = null
    private var deviceId: String = ""
    private var concerts: MutableList<AssignedConcert> = mutableListOf()
    private var selectedConcert: AssignedConcert? = null
    private var selectedGateId: String? = null
    private var offlineQueue: MutableList<OfflineScan> = mutableListOf()

    private val requestCameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera() else toast("Cần cấp quyền camera để quét QR.")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("ticketbox_scanner_native", Context.MODE_PRIVATE)
        deviceId = prefs.getString("deviceId", null) ?: "android-${UUID.randomUUID().toString().take(8)}"
        prefs.edit().putString("deviceId", deviceId).apply()
        apiClient = ApiClient(prefs.getString("apiBaseUrl", "http://192.168.1.5:3000/api/v1")!!)
        accessToken = prefs.getString("accessToken", null)
        userId = prefs.getString("userId", null)
        offlineQueue = loadOfflineQueue()

        buildUi()
        renderSession()

        if (accessToken != null) {
            loadAssignedConcerts()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    private fun buildUi() {
        val scroll = ScrollView(this)
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(24))
            setBackgroundColor(Color.WHITE)
        }
        scroll.addView(root)
        setContentView(scroll)

        root.addView(text("TicketBox Scanner", 24, true))
        root.addView(text("Ứng dụng Android native cho nhân viên soát vé.", 14, false).muted())

        progressBar = ProgressBar(this).apply {
            visibility = View.GONE
            isIndeterminate = true
        }
        root.addView(progressBar)

        statusText = text("", 14, false)
        root.addView(statusText)

        loginPanel = verticalPanel()
        apiUrlInput = input("API URL, ví dụ: http://192.168.1.5:3000/api/v1", apiClient.baseUrl)
        emailInput = input("Email nhân viên", "staff@example.com")
        passwordInput = input("Mật khẩu", "Password123!")
        loginPanel.addView(label("API base URL"))
        loginPanel.addView(apiUrlInput)
        loginPanel.addView(button("Lưu API URL") { saveApiUrl() })
        loginPanel.addView(label("Đăng nhập"))
        loginPanel.addView(emailInput)
        loginPanel.addView(passwordInput)
        loginPanel.addView(button("Đăng nhập") { login() })
        root.addView(loginPanel)

        scannerPanel = verticalPanel()
        scannerPanel.addView(button("Đăng xuất") { logout() })
        scannerPanel.addView(label("Sự kiện được phân công"))
        concertSpinner = Spinner(this)
        scannerPanel.addView(concertSpinner, matchWrap())
        scannerPanel.addView(label("Cổng soát vé"))
        gateSpinner = Spinner(this)
        scannerPanel.addView(gateSpinner, matchWrap())
        scannerPanel.addView(button("Tải lại phân công") { loadAssignedConcerts() })

        resultText = text("", 16, true)
        scannerPanel.addView(resultText)

        manualCodeInput = input("Dán QR token hoặc mã vé", "")
        scannerPanel.addView(label("Nhập mã thủ công"))
        scannerPanel.addView(manualCodeInput)
        scannerPanel.addView(button("Soát vé thủ công") { submitManualCode() })
        scannerPanel.addView(button("Mở camera quét QR") { openCamera() })
        scannerPanel.addView(button("Đóng camera") { stopCamera() })

        cameraContainer = verticalPanel().apply { visibility = View.GONE }
        previewView = PreviewView(this)
        cameraContainer.addView(previewView, ViewGroup.LayoutParams(matchParent(), dp(360)))
        scannerPanel.addView(cameraContainer)

        queueText = text("", 14, false)
        scannerPanel.addView(queueText)
        conflictListText = text("", 12, false).apply {
            setTextColor(Color.rgb(185, 28, 28))
            visibility = View.GONE
        }
        scannerPanel.addView(conflictListText)
        scannerPanel.addView(button("Đồng bộ lượt ngoại tuyến") { syncOfflineQueue() })
        scannerPanel.addView(button("Dọn lượt đã đồng bộ") { clearResolvedQueue() })
        root.addView(scannerPanel)
    }

    private fun renderSession() {
        val loggedIn = accessToken != null
        loginPanel.visibility = if (loggedIn) View.GONE else View.VISIBLE
        scannerPanel.visibility = if (loggedIn) View.VISIBLE else View.GONE
        statusText.text = if (loggedIn) {
            "Đã đăng nhập. Thiết bị: $deviceId. Mạng: ${if (isOnline()) "trực tuyến" else "ngoại tuyến"}"
        } else {
            "Chưa đăng nhập. Hãy nhập API URL bằng IP LAN của laptop."
        }
        renderQueue()
    }

    private fun saveApiUrl() {
        try {
            val normalized = normalizeBaseUrl(apiUrlInput.text.toString())
            apiClient = ApiClient(normalized)
            apiUrlInput.setText(normalized)
            prefs.edit().putString("apiBaseUrl", normalized).apply()
            toast("Đã lưu API URL.")
        } catch (error: Exception) {
            toast(error.message ?: "API URL không hợp lệ.")
        }
    }

    private fun login() {
        saveApiUrl()
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (email.isBlank() || password.isBlank()) {
            toast("Vui lòng nhập email và mật khẩu.")
            return
        }

        launchBusy {
            val body = JSONObject()
                .put("email", email)
                .put("password", password)
            val data = apiClient.request("/auth/login", "POST", body, null) as JSONObject
            val user = data.getJSONObject("user")
            if (user.getString("role") != "CHECKIN_STAFF") {
                throw IllegalStateException("Tài khoản này không có quyền soát vé.")
            }
            accessToken = data.getString("accessToken")
            userId = user.getString("id")
            prefs.edit()
                .putString("accessToken", accessToken)
                .putString("userId", userId)
                .apply()
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
        concerts.clear()
        selectedConcert = null
        selectedGateId = null
        prefs.edit().remove("accessToken").remove("userId").apply()
        renderSession()
    }

    private fun loadAssignedConcerts() {
        val token = accessToken ?: return
        launchBusy {
            val data = apiClient.request("/checkins/concerts", "GET", null, token) as JSONArray
            val nextConcerts = mutableListOf<AssignedConcert>()
            for (index in 0 until data.length()) {
                val item = data.getJSONObject(index)
                val gateIds = item.optJSONArray("gateIds") ?: JSONArray()
                nextConcerts.add(
                    AssignedConcert(
                        id = item.getString("id"),
                        name = item.optString("name", "Concert"),
                        venue = item.optString("venue", ""),
                        startAt = item.optString("startAt", ""),
                        gateIds = (0 until gateIds.length()).map { gateIds.getString(it) }
                    )
                )
            }
            concerts = nextConcerts
            selectedConcert = concerts.firstOrNull()
            selectedGateId = selectedConcert?.gateIds?.firstOrNull()
            withContext(Dispatchers.Main) {
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
        val ticketId = rawCode.trim()
        val concertId = selectedConcert?.id
        val gateId = selectedGateId
        val token = accessToken
        if (ticketId.isBlank() || concertId.isNullOrBlank() || gateId.isNullOrBlank() || token == null) {
            toast("Cần chọn sự kiện/cổng soát vé và nhập mã vé.")
            return
        }

        if (!isOnline()) {
            enqueueOffline(ticketId, "Thiết bị đang ngoại tuyến.")
            return
        }

        launchBusy {
            try {
                val body = JSONObject()
                    .put("ticketId", ticketId)
                    .put("concertId", concertId)
                    .put("gateId", gateId)
                    .put("deviceId", deviceId)
                    .put("scannedAtLocal", Instant.now().toString())
                val data = apiClient.request("/checkins/scan", "POST", body, token) as JSONObject
                withContext(Dispatchers.Main) { renderScanResult(data) }
            } catch (error: Exception) {
                enqueueOffline(ticketId, error.message ?: "Không kết nối được với backend.")
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
        resultText.text = resultMsg
        resultText.setTextColor(if (status == "VALID") Color.rgb(21, 128, 61) else Color.rgb(185, 28, 28))
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
        saveOfflineQueue()
        runOnUiThread {
            resultText.text = "Đã lưu lượt quét vào hàng đợi ngoại tuyến."
            resultText.setTextColor(Color.rgb(180, 83, 9))
            renderQueue()
        }
    }

    private fun syncOfflineQueue() {
        val token = accessToken ?: return
        val concertId = selectedConcert?.id ?: return
        val gateId = selectedGateId ?: return
        val pending = offlineQueue.filter {
            it.syncStatus == "PENDING" &&
                it.concertId == concertId &&
                it.deviceId == deviceId &&
                it.staffId == userId
        }
        if (pending.isEmpty()) {
            toast("Không có lượt quét ngoại tuyến cần đồng bộ.")
            return
        }

        launchBusy {
            val logs = JSONArray()
            pending.forEach {
                logs.put(JSONObject().put("ticketId", it.ticketId).put("scannedAtLocal", it.scannedAtLocal))
            }
            val body = JSONObject()
                .put("concertId", concertId)
                .put("gateId", gateId)
                .put("deviceId", deviceId)
                .put("logs", logs)
            val data = apiClient.request("/checkins/sync", "POST", body, token) as JSONObject
            val conflicts = mutableMapOf<String, JSONObject>()
            val conflictArray = data.optJSONArray("conflicts") ?: JSONArray()
            for (index in 0 until conflictArray.length()) {
                val item = conflictArray.getJSONObject(index)
                conflicts["${item.getString("ticketId")}|${item.getString("scannedAtLocal")}"] = item
            }

            offlineQueue = offlineQueue.map { item ->
                if (pending.none { it.localId == item.localId }) {
                    item
                } else {
                    val conflictItem = conflicts["${item.ticketId}|${item.scannedAtLocal}"]
                    if (conflictItem == null) {
                        item.copy(syncStatus = "SYNCED", lastError = null)
                    } else {
                        val reason = conflictItem.optString("reason", "Conflict")
                        val cust = conflictItem.optJSONObject("customer")
                        item.copy(
                            syncStatus = "CONFLICT",
                            lastError = reason,
                            customerName = cust?.optString("name"),
                            customerEmail = cust?.optString("email"),
                            customerPhone = cust?.optString("phone"),
                            customerCompany = cust?.optString("company")
                        )
                    }
                }
            }.toMutableList()
            saveOfflineQueue()

            withContext(Dispatchers.Main) {
                renderQueue()
                toast("Đồng bộ xong: ${data.optInt("syncedCount")} thành công, ${data.optInt("conflictCount")} xung đột.")
            }
        }
    }

    private fun clearResolvedQueue() {
        offlineQueue = offlineQueue.filter { it.syncStatus == "PENDING" || it.syncStatus == "CONFLICT" }.toMutableList()
        saveOfflineQueue()
        renderQueue()
    }

    private fun renderQueue() {
        val pending = offlineQueue.count { it.syncStatus == "PENDING" }
        val conflict = offlineQueue.count { it.syncStatus == "CONFLICT" }
        queueText.text = "Hàng đợi ngoại tuyến: Đang chờ $pending lượt, xung đột $conflict lượt."

        val conflicts = offlineQueue.filter { it.syncStatus == "CONFLICT" }
        if (conflicts.isEmpty()) {
            conflictListText.visibility = View.GONE
            conflictListText.text = ""
        } else {
            conflictListText.visibility = View.VISIBLE
            val sb = java.lang.StringBuilder("Chi tiết vé xung đột:\n")
            conflicts.forEachIndexed { idx, item ->
                sb.append("${idx + 1}. Vé: ${item.ticketId}\n")
                if (item.customerName != null) {
                    val company = item.customerCompany
                    val vipStr = if (!company.isNullOrBlank() && company != "null") " (VIP - $company)" else ""
                    sb.append("   Khách: ${item.customerName} (${item.customerEmail ?: "N/A"})$vipStr\n")
                }
                sb.append("   Lỗi: ${item.lastError ?: "Không rõ lý do"}\n")
            }
            conflictListText.text = sb.toString()
        }
    }

    private fun openCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        cameraActive = true
        cameraContainer.visibility = View.VISIBLE
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor) { imageProxy -> analyzeImage(imageProxy) }
                }
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        }, ContextCompat.getMainExecutor(this))
    }

    private fun stopCamera() {
        cameraActive = false
        cameraContainer.visibility = View.GONE
        ProcessCameraProvider.getInstance(this).get().unbindAll()
    }

    @OptIn(ExperimentalGetImage::class)
    private fun analyzeImage(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || scanLocked || !cameraActive) {
            imageProxy.close()
            return
        }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                val raw = barcodes.firstOrNull()?.rawValue
                if (!raw.isNullOrBlank() && !scanLocked) {
                    scanLocked = true
                    runOnUiThread {
                        stopCamera()
                        submitScan(raw)
                        scanLocked = false
                    }
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }

    private fun loadOfflineQueue(): MutableList<OfflineScan> {
        val raw = prefs.getString("offlineQueue", "[]") ?: "[]"
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
        return result
    }

    private fun saveOfflineQueue() {
        val array = JSONArray()
        offlineQueue.forEach {
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
        prefs.edit().putString("offlineQueue", array.toString()).apply()
    }

    private fun launchBusy(block: suspend () -> Unit) {
        progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { block() }
            } catch (error: Exception) {
                toast(error.message ?: "Có lỗi xảy ra.")
            } finally {
                progressBar.visibility = View.GONE
                renderSession()
            }
        }
    }

    private fun isOnline(): Boolean {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun normalizeBaseUrl(raw: String): String {
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

    private fun toast(message: String) {
        runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
    }

    private fun text(value: String, size: Int, bold: Boolean): TextView {
        return TextView(this).apply {
            text = value
            textSize = size.toFloat()
            setTextColor(Color.rgb(15, 23, 42))
            if (bold) typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, dp(6), 0, dp(6))
        }
    }

    private fun TextView.muted(): TextView {
        setTextColor(Color.rgb(71, 85, 105))
        return this
    }

    private fun label(value: String): TextView = text(value, 13, true)

    private fun input(hintValue: String, defaultValue: String): EditText {
        return EditText(this).apply {
            hint = hintValue
            setText(defaultValue)
            textSize = 15f
            setSingleLine(true)
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
    }

    private fun button(label: String, action: () -> Unit): Button {
        return Button(this).apply {
            text = label
            setAllCaps(false)
            setOnClickListener { action() }
        }
    }

    private fun verticalPanel(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(0, dp(10), 0, dp(10))
        }
    }

    private fun matchWrap(): LinearLayout.LayoutParams {
        return LinearLayout.LayoutParams(matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private fun matchParent() = ViewGroup.LayoutParams.MATCH_PARENT

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}

data class AssignedConcert(
    val id: String,
    val name: String,
    val venue: String,
    val startAt: String,
    val gateIds: List<String>
)

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

class ApiClient(val baseUrl: String) {
    private val client = OkHttpClient()
    private val mediaType = "application/json; charset=utf-8".toMediaType()

    fun request(path: String, method: String, body: JSONObject?, token: String?): Any {
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

        client.newCall(builder.build()).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            val payload = if (raw.isBlank()) JSONObject() else JSONObject(raw)
            if (!response.isSuccessful || payload.optBoolean("success") == false) {
                val errorMessage = payload.optJSONObject("error")?.optString("message")
                    ?: payload.optString("message")
                    ?: "Request failed (${response.code})"
                throw IllegalStateException(errorMessage)
            }
            return payload.opt("data") ?: JSONObject()
        }
    }
}
