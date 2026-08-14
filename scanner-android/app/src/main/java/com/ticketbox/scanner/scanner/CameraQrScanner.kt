package com.ticketbox.scanner.scanner

import androidx.activity.ComponentActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

class CameraQrScanner(
    private val activity: ComponentActivity,
    private val previewView: PreviewView,
    private val onCodeScanned: (String) -> Unit
) {
    private val scanner = BarcodeScanning.getClient()
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private var cameraActive = false
    private var scanLocked = false

    fun start() {
        cameraActive = true
        scanLocked = false
        val cameraProviderFuture = ProcessCameraProvider.getInstance(activity)
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
            cameraProvider.bindToLifecycle(activity, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        }, ContextCompat.getMainExecutor(activity))
    }

    fun stop() {
        cameraActive = false
        runCatching {
            ProcessCameraProvider.getInstance(activity).get().unbindAll()
        }
    }

    fun release() {
        stop()
        scanner.close()
        cameraExecutor.shutdown()
    }

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
                    activity.runOnUiThread {
                        stop()
                        onCodeScanned(raw)
                    }
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }
}
