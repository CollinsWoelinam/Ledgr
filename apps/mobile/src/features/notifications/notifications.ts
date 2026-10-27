import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility, SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

// Local notifications: budget alerts and the weekly summary. Nothing is sent to a server; the phone posts them.

export type Channel = 'budgets' | 'summary';

// Shown even while Ledgr is open. Android drops the heads-up banner when sound is off, so sound stays on.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Android 13+ only shows the permission prompt once a channel exists. Amounts stay hidden on a secure lock screen.
async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const shared = { importance: AndroidImportance.DEFAULT, lockscreenVisibility: AndroidNotificationVisibility.PRIVATE };
  await Notifications.setNotificationChannelAsync('budgets', { name: 'Budget alerts', description: 'When a budget reaches 80% and 100%', ...shared });
  await Notifications.setNotificationChannelAsync('summary', { name: 'Weekly summary', description: 'Your week’s spending, Sundays at 7 pm', ...shared });
}

// Whether Ledgr may post notifications; with `ask`, asks the user when Android still allows asking.
export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function notify(title: string, body: string, url: string, channelId: Channel = 'budgets'): Promise<void> {
  await Notifications.scheduleNotificationAsync({ content: { title, body, data: { url } }, trigger: { channelId } });
}

// Posts at `at`; scheduling the same `id` again replaces it.
export async function notifyAt(id: string, at: number, title: string, body: string, url: string, channelId: Channel): Promise<void> {
  await Notifications.scheduleNotificationAsync({ identifier: id, content: { title, body, data: { url } }, trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId } });
}

export async function cancelScheduled(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
