package com.ledgr.sms

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

// Runs the JS task "LedgrSmsArrived" (registered in index.js) with no UI: sync the inbox, then budget alerts.
class LedgrHeadlessService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    HeadlessJsTaskConfig(TASK, Arguments.createMap(), TIMEOUT_MS, true)

  companion object {
    const val TASK = "LedgrSmsArrived"
    private const val TIMEOUT_MS = 60_000L
  }
}
