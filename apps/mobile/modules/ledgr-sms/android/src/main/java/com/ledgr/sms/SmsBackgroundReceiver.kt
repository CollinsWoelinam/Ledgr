package com.ledgr.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.facebook.react.HeadlessJsTaskService

// Declared in the manifest, so Android delivers SMS_RECEIVED even when Ledgr isn't running. When the app is
// running, the module's own receiver already handles it. Otherwise, for a wallet sender only, it starts
// LedgrHeadlessService, which runs the same sync in JS without a screen. Other senders are ignored here, unread.
class SmsBackgroundReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION || LedgrSmsModule.listening) return
    val watched = WatchedSenders.get(context)
    if (watched.isEmpty()) return
    val senders = Telephony.Sms.Intents.getMessagesFromIntent(intent)?.mapNotNull { it.displayOriginatingAddress?.lowercase() }.orEmpty()
    if (senders.none { it in watched }) return
    // Receiving an SMS puts the app on Android's temporary allowlist, so it may start a service from here.
    runCatching {
      HeadlessJsTaskService.acquireWakeLockNow(context)
      context.startService(Intent(context, LedgrHeadlessService::class.java))
    }
  }
}

// The wallet sender IDs JS last asked to watch (empty = off), kept where the receiver can read them without JS.
object WatchedSenders {
  private const val PREFS = "ledgr_sms"
  private const val KEY = "watched_senders"

  fun get(context: Context): Set<String> = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(KEY, emptySet()).orEmpty()

  fun set(context: Context, senders: List<String>) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putStringSet(KEY, senders.map { it.lowercase() }.toSet()).apply()
  }
}
