import type { Period } from './period';
import type { BudgetProgress } from './progress';

const DAY = 86_400_000;

// How much of the period has gone, 0–1.
export function elapsedRatio(period: Period, now: number): number {
  return Math.min(Math.max((now - period.start) / (period.end - period.start), 0), 1);
}

// Days left including today.
export function daysLeft(period: Period, now: number): number {
  return Math.max(Math.ceil((period.end - now) / DAY), 0);
}

// What can still be spent per day to finish within the budget.
export function dailyAllowance(progress: BudgetProgress, period: Period, now: number): number {
  const days = daysLeft(period, now);
  const left = progress.limitMinor - progress.spentMinor;
  return days > 0 && left > 0 ? Math.floor(left / days) : 0;
}

export type PaceStatus = 'over' | 'nearly' | 'ahead' | 'onPace';

// Over the limit, past the 80% alert threshold (FR-4.3), spending faster than time is passing, or fine.
export function paceStatus(progress: BudgetProgress, elapsed: number): PaceStatus {
  if (progress.ratio >= 1) return 'over';
  if (progress.ratio >= 0.8) return 'nearly';
  if (progress.ratio > elapsed + 0.02) return 'ahead';
  return 'onPace';
}
