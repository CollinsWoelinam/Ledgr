import type { Budget, Transaction } from '@/db/schema';
import { inPeriod, type Period } from './period';

export interface BudgetProgress {
  categoryId: string | null;
  limitMinor: number;
  spentMinor: number;
  ratio: number;
}

export function spentIn(transactions: Transaction[], period: Period, categoryId: string | null): number {
  return transactions
    .filter((t) => t.direction === 'out' && inPeriod(t.occurredAt, period) && (categoryId === null || t.categoryId === categoryId))
    .reduce((sum, t) => sum + t.amountMinor, 0);
}

export function budgetProgress(budgets: Budget[], transactions: Transaction[], period: Period): BudgetProgress[] {
  return budgets.map((b) => {
    const spentMinor = spentIn(transactions, period, b.categoryId);
    return { categoryId: b.categoryId, limitMinor: b.amountMinor, spentMinor, ratio: b.amountMinor > 0 ? spentMinor / b.amountMinor : 0 };
  });
}
