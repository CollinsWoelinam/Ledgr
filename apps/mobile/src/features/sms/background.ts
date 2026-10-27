import { openLedgerDb } from '@/db/client';
import { checkBudgetAlerts } from '@/features/budgets/checkAlerts';
import { refreshWeeklySummary } from '@/features/insights/weeklySchedule';
import { flushLedgerWrites, useLedger } from '@/state/ledger';
import { useSettings } from '@/state/settings';
import { syncInbox } from './sync';

// The SMS app stores a message a moment after Android announces it.
const INBOX_SETTLE_MS = 3000;

// Runs with no screen when a wallet SMS arrives while Ledgr is closed (LedgrHeadlessService on Android): the same
// sync as when the app is open, then budget alerts (so an alert comes as soon as the money moves) and the weekly
// summary's latest figures.
export async function runBackgroundSync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, INBOX_SETTLE_MS));
  if (!useSettings.persist.hasHydrated()) await new Promise<void>((resolve) => useSettings.persist.onFinishHydration(() => resolve()));
  if (useSettings.getState().dataSource !== 'sms') return;
  if (!useLedger.getState().ready) {
    const { db, encrypted } = await openLedgerDb();
    await useLedger.getState().attach(db, encrypted);
  }
  await syncInbox();
  await checkBudgetAlerts(false);
  await refreshWeeklySummary();
  await flushLedgerWrites();
}
