import { cancelScheduled, notificationsAllowed, notifyAt } from '@/features/notifications/notifications';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { upcomingSends, weeklyMessage } from './weekly';

// A scheduled notification's text is fixed when it's scheduled, so the next few Sundays are rescheduled
// whenever transactions change (every sync, including in the background). A summary therefore always reflects
// the latest data, and a week with no activity still gets its "nothing spent" summary.
const IDS = ['weekly-summary-0', 'weekly-summary-1', 'weekly-summary-2', 'weekly-summary-3'];

export async function refreshWeeklySummary(now = new Date()): Promise<void> {
  const settings = useSettings.getState();
  if (settings.dataSource !== 'sms' || !settings.weeklySummary || !(await notificationsAllowed(false))) {
    await cancelScheduled(IDS);
    return;
  }
  const data = useLedger.getState();
  const sends = upcomingSends(now, IDS.length);
  await Promise.all(
    IDS.map((id, i) => {
      const { title, body } = weeklyMessage(data, sends[i]!, settings.monthStartDay, settings.currency);
      return notifyAt(id, sends[i]!, title, body, '/insights', 'summary');
    }),
  );
}
