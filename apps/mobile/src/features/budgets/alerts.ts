import { formatMoney } from '@/lib/format';
import type { Period } from './period';
import type { BudgetProgress } from './progress';

// FR-4.3: a notification at 80% and at 100% of a budget, once per threshold per budget month.

export type Threshold = 80 | 100;

export interface BudgetAlert {
  key: string;
  threshold: Threshold;
  progress: BudgetProgress;
}

// Identifies one threshold of one budget in one budget month, so it's announced only once.
export const alertKey = (period: Period, categoryId: string | null, threshold: Threshold) => `${period.start}:${categoryId ?? 'overall'}:${threshold}`;

// Every threshold this budget has reached (both, once it's over).
export function crossedKeys(p: BudgetProgress, period: Period): string[] {
  const reached: Threshold[] = p.ratio >= 1 ? [80, 100] : p.ratio >= 0.8 ? [80] : [];
  return reached.map((t) => alertKey(period, p.categoryId, t));
}

// Thresholds reached but not yet announced. A budget that jumps straight past 100% gets one alert, not two.
export function dueAlerts(progress: BudgetProgress[], period: Period, sent: string[]): BudgetAlert[] {
  const done = new Set(sent);
  return progress.flatMap((p) => {
    const threshold: Threshold | null = p.ratio >= 1 ? 100 : p.ratio >= 0.8 ? 80 : null;
    const key = threshold && alertKey(period, p.categoryId, threshold);
    return threshold && key && !done.has(key) ? [{ key, threshold, progress: p }] : [];
  });
}

// Announced keys from earlier budget months are no longer needed.
export const keysForPeriod = (sent: string[], period: Period) => sent.filter((k) => k.startsWith(`${period.start}:`));

export function alertMessage(alert: BudgetAlert, name: string, currency: string, daysLeft: number): { title: string; body: string } {
  const { spentMinor, limitMinor } = alert.progress;
  const spent = `${formatMoney(spentMinor, currency)} of ${formatMoney(limitMinor, currency)} spent`;
  const days = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left this month`;
  if (alert.threshold === 100) {
    return { title: `${name} budget used up`, body: spentMinor > limitMinor ? `${formatMoney(spentMinor - limitMinor, currency)} over: ${spent}, ${days}.` : `${spent}, ${days}.` };
  }
  return { title: `${name} budget ${Math.floor(alert.progress.ratio * 100)}% used`, body: `${formatMoney(limitMinor - spentMinor, currency)} left: ${spent}, ${days}.` };
}
