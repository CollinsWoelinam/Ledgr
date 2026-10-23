package com.ledgr.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import io.github.expo.modules.v2.Event
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.Record
import io.github.expo.modules.v2.react.androidContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Record
data class InboxSms(val id: String, val sender: String, val body: String, val receivedAt: Double)

@Record
data class SmsArrived(val sender: String)

// Reads mobile money SMS from the inbox and signals when new ones arrive.
// Only allowlisted senders are ever read; other messages never leave Android's SMS store.
@ExpoModule("LedgrSms")
class LedgrSmsModule : Module() {
  private var receiver: BroadcastReceiver? = null

  // Fires while JS listens. Carries only the sender: JS re-reads the inbox, so there is one code path
  // and the same timestamps whether a message arrives live or is found by a later scan.
  @Event(name = "onSmsArrived")
  private val onSmsArrived = event<SmsArrived>(
    onStartObserving = { register() },
    onStopObserving = { unregister() }
  )

  override fun onDestroy() = unregister()

  // Messages from `senders` received after `sinceMs`, oldest first, at most `limit`.
  @JS
  suspend fun readInbox(senders: List<String>, sinceMs: Double, limit: Int): List<InboxSms> = withContext(Dispatchers.IO) {
    val out = mutableListOf<InboxSms>()
    query(senders, sinceMs, arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE))?.use { c ->
      while (out.size < limit && c.moveToNext()) {
        out.add(InboxSms(c.getString(0), c.getString(1) ?: "", c.getString(2) ?: "", c.getLong(3).toDouble()))
      }
    }
    out
  }

  @JS
  suspend fun countInbox(senders: List<String>, sinceMs: Double): Int = withContext(Dispatchers.IO) {
    query(senders, sinceMs, arrayOf(Telephony.Sms._ID))?.use { it.count } ?: 0
  }

  private fun query(senders: List<String>, sinceMs: Double, projection: Array<String>) =
    if (senders.isEmpty()) {
      null
    } else {
      androidContext.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        projection,
        "LOWER(${Telephony.Sms.ADDRESS}) IN (${senders.joinToString(",") { "?" }}) AND ${Telephony.Sms.DATE} > ?",
        (senders.map { it.lowercase() } + sinceMs.toLong().toString()).toTypedArray(),
        "${Telephony.Sms.DATE} ASC"
      )
    }

  private fun register() {
    if (receiver != null) return
    val r = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        val senders = Telephony.Sms.Intents.getMessagesFromIntent(intent)?.mapNotNull { it.displayOriginatingAddress }?.toSet().orEmpty()
        senders.forEach { onSmsArrived(SmsArrived(it)) }
      }
    }
    val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
    // SMS_RECEIVED comes from the system, so the receiver has to be exported.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      androidContext.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
    } else {
      androidContext.registerReceiver(r, filter)
    }
    receiver = r
  }

  private fun unregister() {
    receiver?.let { runCatching { androidContext.unregisterReceiver(it) } }
    receiver = null
  }
}
