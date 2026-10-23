import type { Transaction } from '@/db/schema';
import { periodContaining } from '@/features/budgets/period';

// Months are budget periods (they start on the user's month-start day). An offset counts periods back from the
// current one: 0 is this month, -1 last month, and so on.
export function offsetOf(at: number, now: number, startDay: number): number {
  const p = new Date(periodContaining(new Date(at), startDay).start);
  const c = new Date(periodContaining(new Date(now), startDay).start);
  return (p.getFullYear() - c.getFullYear()) * 12 + (p.getMonth() - c.getMonth());
}

export interface MonthsWithData {
  offsets: Set<number>; // months with at least one transaction
  oldest: number; // most negative offset with data, 0 when there is none
}

export function monthsWithData(transactions: Transaction[], now: number, startDay: number): MonthsWithData {
  const offsets = new Set<number>();
  for (const t of transactions) if (t.occurredAt <= now) offsets.add(offsetOf(t.occurredAt, now, startDay));
  return { offsets, oldest: Math.min(0, ...offsets) };
}
