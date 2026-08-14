package com.ticketbox.scanner.ui

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class ScannerUiFactory(private val context: Context) {
    fun text(value: String, size: Int, bold: Boolean): TextView {
        return TextView(context).apply {
            text = value
            textSize = size.toFloat()
            setTextColor(Color.rgb(15, 23, 42))
            if (bold) typeface = Typeface.DEFAULT_BOLD
            setPadding(0, dp(4), 0, dp(4))
        }
    }

    fun label(value: String): TextView {
        return text(value, 13, true).apply {
            setTextColor(Color.rgb(71, 85, 105))
            setPadding(0, dp(10), 0, dp(4))
            layoutParams = LinearLayout.LayoutParams(matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, dp(8), 0, 0)
            }
        }
    }

    fun input(hintValue: String, defaultValue: String): EditText {
        return EditText(context).apply {
            hint = hintValue
            setText(defaultValue)
            textSize = 14f
            setSingleLine(true)
            setTextColor(Color.rgb(15, 23, 42))
            setHintTextColor(Color.rgb(148, 163, 184))
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = borderedBackground(Color.rgb(248, 250, 252), Color.rgb(226, 232, 240))
            layoutParams = LinearLayout.LayoutParams(matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, dp(4), 0, dp(10))
            }
        }
    }

    fun button(label: String, action: () -> Unit): Button {
        return Button(context).apply {
            text = label
            setAllCaps(false)
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            val (bgColor, textColor) = when (label) {
                "Đăng xuất", "Đóng camera" -> Pair(Color.rgb(239, 68, 68), Color.WHITE)
                "Dọn lượt đã đồng bộ", "Tải lại phân công" -> Pair(Color.rgb(226, 232, 240), Color.rgb(71, 85, 105))
                else -> Pair(Color.rgb(79, 70, 229), Color.WHITE)
            }
            setTextColor(textColor)
            setPadding(dp(16), dp(12), dp(16), dp(12))
            background = filledBackground(bgColor)
            elevation = dp(2).toFloat()
            setOnClickListener { action() }
            layoutParams = LinearLayout.LayoutParams(matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, dp(6), 0, dp(10))
            }
        }
    }

    fun verticalPanel(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(20), dp(20), dp(20), dp(20))
            background = borderedBackground(Color.WHITE, Color.rgb(226, 232, 240))
            layoutParams = LinearLayout.LayoutParams(matchParent(), ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, dp(12), 0, dp(12))
            }
        }
    }

    fun filledBackground(color: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(8).toFloat()
            setColor(color)
        }
    }

    fun borderedBackground(fillColor: Int, strokeColor: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(8).toFloat()
            setColor(fillColor)
            setStroke(dp(1), strokeColor)
        }
    }

    fun matchParent() = ViewGroup.LayoutParams.MATCH_PARENT

    fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()
}

fun TextView.muted(): TextView {
    setTextColor(Color.rgb(100, 116, 139))
    return this
}
