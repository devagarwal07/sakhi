package com.sakhi.partner.driver

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * IncomingRideActivity — TRUE native half-screen UI
 *
 * This is NOT a trampoline. It shows a native programmatic UI immediately
 * and waits for user interaction. Only on Accept does it open MainActivity.
 *
 * Flow:
 *   Notifee fullScreenAction → this Activity opens instantly (no RN cold boot)
 *     → shows native half-screen card UI (title, fare, rider, pickup, drop)
 *     → Accept → write _action=accept to SharedPreferences → open MainActivity
 *     → Decline → finish() (notification cancel handled by Notifee BG handler)
 */
class IncomingRideActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── 1. Wake screen & show over lock screen ─────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        // Dismiss keyguard so the ride popup is immediately visible
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            km.requestDismissKeyguard(this, null)
        }

        // ── 2. Store ride payload → SharedPreferences for JS bridge ────────────
        val prefs = getSharedPreferences("SakhiRideBridge", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        val extras = intent?.extras
        if (extras != null) {
            for (key in extras.keySet()) {
                val v = extras.get(key)
                if (v != null) editor.putString(key, v.toString())
            }
            editor.putString("_bridgeTimestamp", System.currentTimeMillis().toString())
            editor.apply()
        }

        // ── 3. Read ride data for display ──────────────────────────────────────
        val fare       = prefs.getString("fare", "") ?: ""
        val riderName  = prefs.getString("rider_name", "Rider") ?: "Rider"
        val pickup     = prefs.getString("pickup_address", "Pickup Location") ?: "Pickup Location"
        val dropoff    = prefs.getString("dropoff_address", null)
                      ?: prefs.getString("drop_address", "Drop Location")
                      ?: "Drop Location"
        val distKm     = prefs.getString("distance_to_pickup_km", "") ?: ""
        val distStr    = if (distKm.isNotEmpty()) "$distKm km away" else ""

        // ── 4. Build programmatic native UI ────────────────────────────────────

        // Root: full screen, dimmed background, items anchored to bottom
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.BOTTOM
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#99000000"))
        }

        // Card: white rounded sheet
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadii = floatArrayOf(48f, 48f, 48f, 48f, 0f, 0f, 0f, 0f)
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(64, 72, 64, 80)
        }

        // Header row: bell icon + title
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 48)
        }
        val bellIcon = TextView(this).apply {
            text = "🔔"
            textSize = 28f
            setPadding(0, 0, 24, 0)
        }
        val titleTv = TextView(this).apply {
            text = "New Ride Request"
            textSize = 22f
            setTextColor(Color.BLACK)
            setTypeface(null, Typeface.BOLD)
        }
        headerRow.addView(bellIcon)
        headerRow.addView(titleTv)

        // Rider name + fare row
        val riderRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL or Gravity.START
            setPadding(0, 0, 0, 32)
        }
        val riderTv = TextView(this).apply {
            text = riderName
            textSize = 17f
            setTextColor(Color.parseColor("#222222"))
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        val fareTv = TextView(this).apply {
            text = if (fare.isNotEmpty()) "₹$fare" else ""
            textSize = 20f
            setTextColor(Color.parseColor("#6B21A8"))
            setTypeface(null, Typeface.BOLD)
        }
        riderRow.addView(riderTv)
        riderRow.addView(fareTv)

        // Distance
        if (distStr.isNotEmpty()) {
            val distTv = TextView(this).apply {
                text = "📍 $distStr"
                textSize = 14f
                setTextColor(Color.GRAY)
                setPadding(0, 0, 0, 24)
            }
            card.addView(distTv)
        }

        // Pickup row
        val pickupTv = TextView(this).apply {
            text = "🟢  $pickup"
            textSize = 15f
            setTextColor(Color.parseColor("#333333"))
            setPadding(0, 0, 0, 16)
        }

        // Drop row
        val dropTv = TextView(this).apply {
            text = "🔴  $dropoff"
            textSize = 15f
            setTextColor(Color.parseColor("#333333"))
            setPadding(0, 0, 0, 48)
        }

        // Button row
        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val declineBtn = Button(this).apply {
            text = "DECLINE"
            textSize = 14f
            setTextColor(Color.parseColor("#555555"))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#EEEEEE"))
                cornerRadius = 32f
            }
            layoutParams = LinearLayout.LayoutParams(0, 130, 1f).apply {
                setMargins(0, 0, 24, 0)
            }
            setOnClickListener {
                // Just close — Notifee BG handler will handle the decline API call
                finish()
            }
        }

        val acceptBtn = Button(this).apply {
            text = "ACCEPT RIDE"
            textSize = 14f
            setTextColor(Color.WHITE)
            setTypeface(null, Typeface.BOLD)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#6B21A8"))
                cornerRadius = 32f
            }
            layoutParams = LinearLayout.LayoutParams(0, 130, 2f)
            setOnClickListener {
                // Mark accepted in SharedPreferences so the JS bridge picks it up
                prefs.edit().putString("_action", "accept").apply()

                // Now open MainActivity (React Native app)
                val mainIntent = Intent(this@IncomingRideActivity, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    )
                    putExtra("INCOMING_RIDE_BRIDGE", true)
                }
                startActivity(mainIntent)
                finish()
            }
        }

        btnRow.addView(declineBtn)
        btnRow.addView(acceptBtn)

        // Assemble card
        card.addView(headerRow)
        card.addView(riderRow)
        card.addView(pickupTv)
        card.addView(dropTv)
        card.addView(btnRow)

        // Assemble root
        root.addView(card)
        setContentView(root)
    }
}
