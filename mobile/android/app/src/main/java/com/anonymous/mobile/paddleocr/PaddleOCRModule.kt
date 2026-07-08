package com.anonymous.mobile.paddleocr

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.nio.FloatBuffer
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

/**
 * PaddleOCR 端侧文字识别模块
 * 使用 PP-OCRv4 mobile 超轻量模型（检测 + 识别），ONNX Runtime 推理
 */
class PaddleOCRModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var env: OrtEnvironment? = null
    private var detSession: OrtSession? = null
    private var recSession: OrtSession? = null

    private val detShortSize = 640
    private val recImgH = 48
    private val recImgW = 320

    private val dictChars = mutableListOf<String>()

    override fun getName(): String = "PaddleOCR"

    override fun onCatalystInstanceDestroy() {
        release()
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            if (detSession != null && recSession != null) {
                promise.resolve(true)
                return
            }

            env = OrtEnvironment.getEnvironment()
            val options = OrtSession.SessionOptions().apply {
                setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
                setIntraOpNumThreads(4)
            }

            val detBytes = reactContext.assets.open("models/ch_PP-OCRv4_det_infer.onnx").use { it.readBytes() }
            detSession = env?.createSession(detBytes, options)
            Log.d(TAG, "Det model loaded, bytes: ${detBytes.size}")

            val recBytes = reactContext.assets.open("models/ch_PP-OCRv4_rec_infer.onnx").use { it.readBytes() }
            recSession = env?.createSession(recBytes, options)
            Log.d(TAG, "Rec model loaded, bytes: ${recBytes.size}")

            loadDictionary()
            Log.d(TAG, "Dictionary loaded, size: ${dictChars.size}")

            promise.resolve(true)
        } catch (e: Exception) {
            Log.w(TAG, "init failed", e)
            promise.reject("INIT_FAILED", e.message ?: "Failed to initialize PaddleOCR")
        }
    }

    private fun loadDictionary() {
        dictChars.clear()
        dictChars.add("blank")
        reactContext.assets.open("models/ppocr_keys_v1.txt").bufferedReader().useLines { lines ->
            lines.forEach { line ->
                if (line.isNotBlank()) {
                    dictChars.add(line.trim())
                }
            }
        }
    }

    @ReactMethod
    fun recognize(imagePath: String, promise: Promise) {
        try {
            val detSess = detSession ?: run {
                promise.reject("NOT_INITIALIZED", "PaddleOCR not initialized")
                return
            }
            val recSess = recSession ?: run {
                promise.reject("NOT_INITIALIZED", "PaddleOCR not initialized")
                return
            }

            Log.d(TAG, "Recognizing: $imagePath")
            val cleanPath = imagePath.replace("^file:///+".toRegex(), "")
            val imageFile = File(cleanPath)
            if (!imageFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image not found: $cleanPath")
                return
            }

            val originalBmp = BitmapFactory.decodeFile(cleanPath)
            if (originalBmp == null) {
                promise.reject("DECODE_FAILED", "Failed to decode image")
                return
            }

            Log.d(TAG, "Image loaded: ${originalBmp.width}x${originalBmp.height}")

            val boxes = detectText(detSess, originalBmp)
            Log.d(TAG, "Detected ${boxes.size} text regions")

            val results = Arguments.createArray()

            for ((index, box) in boxes.withIndex()) {
                try {
                    val cropped = cropPerspective(originalBmp, box)
                    val (text, confidence) = recognizeText(recSess, cropped)
                    cropped.recycle()

                    if (text.isNotEmpty() && confidence > 0.3f) {
                        val map = Arguments.createMap()
                        map.putString("text", text)
                        map.putDouble("confidence", confidence.toDouble())
                        results.pushMap(map)
                        Log.d(TAG, "Box $index: '$text' (${confidence * 100}%)")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Recognize box $index failed", e)
                }
            }

            originalBmp.recycle()
            Log.d(TAG, "Recognition done, ${results.size()} results")
            promise.resolve(results)
        } catch (e: Exception) {
            Log.w(TAG, "recognize failed", e)
            promise.reject("PROCESS_FAILED", e.message ?: "Failed to recognize")
        }
    }

    // ========== 检测部分 ==========

    private data class Point(val x: Float, val y: Float)

    private fun detectText(session: OrtSession, bmp: Bitmap): List<List<Point>> {
        val ratio = detShortSize.toFloat() / min(bmp.width, bmp.height)
        val newW = (bmp.width * ratio).toInt()
        val newH = (bmp.height * ratio).toInt()

        val finalW = (newW / 32) * 32
        val finalH = (newH / 32) * 32

        val scaledBmp = Bitmap.createScaledBitmap(bmp, finalW, finalH, true)
        val inputTensor = preprocessDet(scaledBmp)

        val inputName = session.inputNames.first()
        val output = session.run(mapOf(inputName to inputTensor))
        val outputTensor = output.get(0) as OnnxTensor

        val shape = outputTensor.info.shape
        val outH = shape[1].toInt()
        val outW = shape[2].toInt()
        val floatArray = FloatArray(outH * outW)
        outputTensor.floatBuffer.get(floatArray)

        val boxes = extractBoxesFromProbMap(floatArray, outW, outH, finalW, finalH, ratio)

        inputTensor.close()
        output.close()
        outputTensor.close()
        scaledBmp.recycle()

        return boxes
    }

    private fun preprocessDet(bmp: Bitmap): OnnxTensor {
        val w = bmp.width
        val h = bmp.height
        val pixels = IntArray(w * h)
        bmp.getPixels(pixels, 0, w, 0, 0, w, h)

        val floatData = FloatBuffer.allocate(3 * h * w)
        for (c in 0 until 3) {
            for (i in 0 until h * w) {
                val pixel = pixels[i]
                val value = when (c) {
                    0 -> (pixel shr 16 and 0xFF) / 255.0f
                    1 -> (pixel shr 8 and 0xFF) / 255.0f
                    else -> (pixel and 0xFF) / 255.0f
                }
                floatData.put((value - 0.5f) / 0.5f)
            }
        }
        floatData.rewind()

        val shape = longArrayOf(1L, 3L, h.toLong(), w.toLong())
        return OnnxTensor.createTensor(env, floatData, shape)
    }

    private fun extractBoxesFromProbMap(
        probMap: FloatArray,
        mapW: Int,
        mapH: Int,
        imgW: Int,
        imgH: Int,
        ratio: Float
    ): List<List<Point>> {
        val threshold = 0.3f
        val scaleX = imgW.toFloat() / mapW / ratio
        val scaleY = imgH.toFloat() / mapH / ratio

        val visited = BooleanArray(mapW * mapH)
        val boxes = mutableListOf<List<Point>>()

        for (y in 0 until mapH) {
            for (x in 0 until mapW) {
                val idx = y * mapW + x
                if (!visited[idx] && probMap[idx] > threshold) {
                    val queue = ArrayDeque<Pair<Int, Int>>()
                    queue.add(x to y)
                    visited[idx] = true

                    var minX = x
                    var maxX = x
                    var minY = y
                    var maxY = y

                    while (queue.isNotEmpty()) {
                        val (cx, cy) = queue.removeFirst()
                        minX = min(minX, cx)
                        maxX = max(maxX, cx)
                        minY = min(minY, cy)
                        maxY = max(maxY, cy)

                        val neighbors = listOf(
                            cx - 1 to cy, cx + 1 to cy,
                            cx to cy - 1, cx to cy + 1
                        )
                        for ((nx, ny) in neighbors) {
                            if (nx in 0 until mapW && ny in 0 until mapH) {
                                val nidx = ny * mapW + nx
                                if (!visited[nidx] && probMap[nidx] > threshold) {
                                    visited[nidx] = true
                                    queue.add(nx to ny)
                                }
                            }
                        }
                    }

                    val area = (maxX - minX) * (maxY - minY)
                    if (area > 100) {
                        val padding = 2
                        val p1 = Point((minX - padding) * scaleX, (minY - padding) * scaleY)
                        val p2 = Point((maxX + padding) * scaleX, (minY - padding) * scaleY)
                        val p3 = Point((maxX + padding) * scaleX, (maxY + padding) * scaleY)
                        val p4 = Point((minX - padding) * scaleX, (maxY + padding) * scaleY)
                        boxes.add(listOf(p1, p2, p3, p4))
                    }
                }
            }
        }

        return boxes
    }

    // ========== 识别部分 ==========

    private fun cropPerspective(bmp: Bitmap, box: List<Point>): Bitmap {
        val minX = box.minOf { it.x }.coerceAtLeast(0f)
        val maxX = box.maxOf { it.x }.coerceAtMost(bmp.width.toFloat())
        val minY = box.minOf { it.y }.coerceAtLeast(0f)
        val maxY = box.maxOf { it.y }.coerceAtMost(bmp.height.toFloat())

        val w = (maxX - minX).toInt()
        val h = (maxY - minY).toInt()
        if (w <= 0 || h <= 0) {
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        }

        return Bitmap.createBitmap(bmp, minX.toInt(), minY.toInt(), w, h)
    }

    private fun recognizeText(session: OrtSession, bmp: Bitmap): Pair<String, Float> {
        val h = recImgH
        val ratio = bmp.width.toFloat() / bmp.height.toFloat()
        val w = (h * ratio).toInt().coerceAtMost(recImgW)

        val scaledBmp = Bitmap.createScaledBitmap(bmp, w, h, true)
        val inputTensor = preprocessRec(scaledBmp, w, h)

        val inputName = session.inputNames.first()
        val output = session.run(mapOf(inputName to inputTensor))
        val outputTensor = output.get(0) as OnnxTensor

        val shape = outputTensor.info.shape
        val timeSteps = shape[1].toInt()
        val numClasses = shape[2].toInt()
        val outputArray = FloatArray(timeSteps * numClasses)
        outputTensor.floatBuffer.get(outputArray)

        val (text, confidence) = ctcGreedyDecode(outputArray, timeSteps, numClasses)

        inputTensor.close()
        output.close()
        outputTensor.close()
        scaledBmp.recycle()

        return text to confidence
    }

    private fun preprocessRec(bmp: Bitmap, width: Int, height: Int): OnnxTensor {
        val pixels = IntArray(width * height)
        bmp.getPixels(pixels, 0, width, 0, 0, width, height)

        val floatData = FloatBuffer.allocate(3 * height * width)

        for (c in 0 until 3) {
            for (y in 0 until height) {
                for (x in 0 until width) {
                    val pixel = pixels[y * width + x]
                    val value = when (c) {
                        0 -> (pixel shr 16 and 0xFF) / 255.0f
                        1 -> (pixel shr 8 and 0xFF) / 255.0f
                        else -> (pixel and 0xFF) / 255.0f
                    }
                    floatData.put((value - 0.5f) / 0.5f)
                }
            }
        }

        floatData.rewind()

        val shape = longArrayOf(1L, 3L, height.toLong(), width.toLong())
        return OnnxTensor.createTensor(env, floatData, shape)
    }

    private fun ctcGreedyDecode(
        output: FloatArray,
        timeSteps: Int,
        numClasses: Int
    ): Pair<String, Float> {
        val textBuilder = StringBuilder()
        var lastIndex = 0
        var totalConfidence = 0f
        var count = 0

        for (t in 0 until timeSteps) {
            var maxIdx = 0
            var maxVal = Float.NEGATIVE_INFINITY
            for (c in 0 until numClasses) {
                val idx = t * numClasses + c
                if (idx < output.size && output[idx] > maxVal) {
                    maxVal = output[idx]
                    maxIdx = c
                }
            }

            val prob = 1.0f / (1.0f + exp(-maxVal))

            if (maxIdx != 0 && maxIdx != lastIndex) {
                if (maxIdx < dictChars.size) {
                    textBuilder.append(dictChars[maxIdx])
                }
                totalConfidence += prob
                count++
            }
            lastIndex = maxIdx
        }

        val avgConfidence = if (count > 0) totalConfidence / count else 0f
        return textBuilder.toString() to avgConfidence
    }

    @ReactMethod
    fun release() {
        detSession?.close()
        recSession?.close()
        detSession = null
        recSession = null
    }

    companion object {
        private const val TAG = "PaddleOCRModule"
    }
}
