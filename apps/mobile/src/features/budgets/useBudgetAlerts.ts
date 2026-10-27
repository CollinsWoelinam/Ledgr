import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { checkBudgetAlerts } from './checkAlerts';

// While Ledgr is open: checks budget alerts whenever transactions or budgets change (the background sync does
// the same while it's closed), and opens Budgets when an alert is tapped.
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
    // A budget just set or changed is on screen, so nothing to announce. Budgets loading at launch aren't a change.
    const budgetsChanged = lastBudgets.current !== null && lastBudgets.current !== budgets;
    lastBudgets.current = budgets;
    void checkBudgetAlerts(budgetsChanged);
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
