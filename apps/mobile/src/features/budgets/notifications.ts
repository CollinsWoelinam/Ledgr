import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

// Local notifications for budget alerts. Nothing is sent to a server: they're posted by the phone itself.

const CHANNEL = 'budgets';

// Shown even while Ledgr is open. Android drops the heads-up banner when sound is off, so sound stays on.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Android 13+ only shows the permission prompt once a channel exists. Amounts stay hidden on a secure lock screen.
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Budget alerts',
    description: 'When a budget reaches 80% and 100%',
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  });
}

// Whether Ledgr may post notifications; with `ask`, asks the user when Android still allows asking.
export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function notify(title: string, body: string, url: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({ content: { title, body, data: { url } }, trigger: { channelId: CHANNEL } });
}
