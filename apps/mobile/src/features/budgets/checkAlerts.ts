import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { alertMessage, crossedKeys, dueAlerts, keysForPeriod } from './alerts';
import { notificationsAllowed, notify } from './notifications';
import { daysLeft } from './pace';
import { periodContaining } from './period';
import { budgetProgress } from './progress';

// Posts a notification for each budget threshold newly reached this budget month (US-10), and remembers it so
// it's posted once. `quiet` marks thresholds as seen without posting (a budget just set or changed: what it
// shows is on screen). Used by the app while open, and by the background sync while it's closed.
export async function checkBudgetAlerts(quiet: boolean, now = new Date()): Promise<void> {
  const settings = useSettings.getState();
  if (settings.dataSource !== 'sms') return;
  const { transactions, budgets, categories } = useLedger.getState();
  const period = periodContaining(now, settings.monthStartDay);
  const progress = budgetProgress(budgets, transactions, period);
  const sent = keysForPeriod(settings.alertedBudgets, period);

  const due = settings.budgetAlerts && !quiet ? dueAlerts(progress, period, sent) : [];
  const crossed = quiet || !settings.budgetAlerts ? progress.flatMap((p) => crossedKeys(p, period)) : due.flatMap((a) => crossedKeys(a.progress, period));
  const next = [...new Set([...sent, ...crossed])];
  if (next.length !== settings.alertedBudgets.length || next.some((k, i) => k !== settings.alertedBudgets[i])) settings.setAlertedBudgets(next);
  if (!due.length || !(await notificationsAllowed(false))) return;

  for (const alert of due) {
    const name = alert.progress.categoryId === null ? 'Overall' : (categories.find((c) => c.id === alert.progress.categoryId)?.name ?? 'Category');
    const { title, body } = alertMessage(alert, name, settings.currency, daysLeft(period, now.getTime()));
    await notify(title, body, '/budgets');
  }
}
