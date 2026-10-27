import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { refreshWeeklySummary } from '@/features/insights/weeklySchedule';
import { checkBudgetAlerts } from './checkAlerts';

// While Ledgr is open: checks budget alerts and refreshes the weekly summary whenever transactions or budgets
// change (the background sync does the same while it's closed), and opens the screen a notification is about.
export function useBudgetAlerts(): void {
  const ready = useLedger((s) => s.ready);
  const transactions = useLedger((s) => s.transactions);
  const budgets = useLedger((s) => s.budgets);
  const categories = useLedger((s) => s.categories);
  const source = useSettings((s) => s.dataSource);
  const enabled = useSettings((s) => s.budgetAlerts);
  const weekly = useSettings((s) => s.weeklySummary);
  const lastBudgets = useRef<typeof budgets | null>(null); // as of the previous check, once loaded

  useEffect(() => {
    if (!ready || source !== 'sms') return;
    // A budget just set or changed is on screen, so nothing to announce. Budgets loading at launch aren't a change.
    const budgetsChanged = lastBudgets.current !== null && lastBudgets.current !== budgets;
    lastBudgets.current = budgets;
    void checkBudgetAlerts(budgetsChanged);
  }, [ready, source, enabled, transactions, budgets, categories]);

  useEffect(() => {
    if (ready) void refreshWeeklySummary();
  }, [ready, source, weekly, transactions, budgets, categories]);

  // Tapping a notification opens its screen (Budgets or Insights), also when it launched the app.
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url !== 'string') return;
    router.push(url as '/budgets' | '/insights');
    void Notifications.clearLastNotificationResponseAsync();
  }, [response]);
}
