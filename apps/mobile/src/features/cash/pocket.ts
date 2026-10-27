import { bundledConfig } from '@ledgr/parser';
import type { Transaction } from '@/db/schema';

// Cash you carry, as a wallet of its own. It has no SMS and no reported balance, only what you record.
export const CASH_WALLET = { id: 'cash', name: 'Cash' } as const;

export const walletName = (id: string) => (id === CASH_WALLET.id ? CASH_WALLET.name : (bundledConfig.providers.find((p) => p.id === id)?.name ?? id));

// Cash-outs already count as spending (under Cash withdrawals), so spending that cash must not count twice.
// Recorded cash spending draws down earlier cash withdrawals instead, most recent first (that's the cash in your
// pocket): the total stays the same and the amount moves into its real category (decided 2026-10-27). Cash spent
// beyond what was withdrawn (cash from elsewhere) counts in full. Only totals use this; lists show real amounts.
export function drawDownCash(transactions: Transaction[]): Transaction[] {
  const spends = transactions.filter((t) => t.provider === CASH_WALLET.id && t.direction === 'out');
  if (spends.length === 0) return transactions;
  const withdrawals = transactions
    .filter((t) => t.provider !== CASH_WALLET.id && t.direction === 'out' && t.categoryId === 'cash')
    .sort((a, b) => b.occurredAt - a.occurredAt);
  if (withdrawals.length === 0) return transactions;

  const left = new Map(withdrawals.map((w) => [w.id, w.amountMinor]));
  for (const spend of [...spends].sort((a, b) => a.occurredAt - b.occurredAt)) {
    let owed = spend.amountMinor;
    for (const w of withdrawals) {
      if (owed === 0) break;
      if (w.occurredAt > spend.occurredAt) continue;
      const take = Math.min(owed, left.get(w.id)!);
      left.set(w.id, left.get(w.id)! - take);
      owed -= take;
    }
  }
  return transactions.map((t) => (left.has(t.id) && left.get(t.id) !== t.amountMinor ? { ...t, amountMinor: left.get(t.id)! } : t));
}
