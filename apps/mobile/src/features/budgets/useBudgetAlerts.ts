import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { alertMessage, crossedKeys, dueAlerts, keysForPeriod } from './alerts';
import { notificationsAllowed, notify } from './notifications';
import { daysLeft } from './pace';
import { periodContaining } from './period';
import { budgetProgress } from './progress';

// Announces budgets reaching 80% and 100% (US-10). Checked whenever transactions change: on launch, and after
// each SMS sync, so a threshold crossed while Ledgr was closed is announced the next time it opens.
export function useBudgetAlerts(): void {
  const ready = useLedger((s) => s.ready);
  const transactions = useLedger((s) => s.transactions);
  const budgets = useLedger((s) => s.budgets);
  const categories = useLedger((s) => s.categories);
  const source = useSettings((s) => s.dataSource);
  const enabled = useSettings((s) => s.budgetAlerts);
  const lastBudgets = useRef<typeof budgets | null>(null); // as of the previous check, once loaded

  useEffect(() => {
    if (!ready || source !== 'sms') return;
    const settings = useSettings.getState();
    const now = new Date();
    const period = periodContaining(now, settings.monthStartDay);
    const progress = budgetProgress(budgets, transactions, period);
    const sent = keysForPeriod(settings.alertedBudgets, period);

    // A budget just set or changed: what it already shows is on screen, so nothing to announce. Budgets loading
    // at launch aren't a change.
    const budgetsChanged = lastBudgets.current !== null && lastBudgets.current !== budgets;
    lastBudgets.current = budgets;
    const due = enabled && !budgetsChanged ? dueAlerts(progress, period, sent) : [];
    const crossed = budgetsChanged || !enabled ? progress.flatMap((p) => crossedKeys(p, period)) : due.flatMap((a) => crossedKeys(a.progress, period));
    const next = [...new Set([...sent, ...crossed])];
    if (next.length !== settings.alertedBudgets.length || next.some((k, i) => k !== settings.alertedBudgets[i])) settings.setAlertedBudgets(next);
    if (!due.length) return;

    void notificationsAllowed(false).then(async (allowed) => {
      if (!allowed) return;
      for (const alert of due) {
        const name = alert.progress.categoryId === null ? 'Overall' : (categories.find((c) => c.id === alert.progress.categoryId)?.name ?? 'Category');
        const { title, body } = alertMessage(alert, name, settings.currency, daysLeft(period, now.getTime()));
        await notify(title, body, '/budgets');
      }
    });
  }, [ready, source, enabled, transactions, budgets, categories]);

  // Tapping an alert opens Budgets, also when it launched the app.
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url !== 'string') return;
    router.push(url as '/budgets');
    void Notifications.clearLastNotificationResponseAsync();
  }, [response]);
}
