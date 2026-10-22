import type { TransactionType } from '@ledgr/parser';
import type { CategoryRule, Transaction } from '@/db/schema';

const TYPE_DEFAULTS: Record<TransactionType, string> = {
  transfer_in: 'income',
  cash_in: 'income',
  transfer_out: 'transfers',
  payment: 'other',
  cash_out: 'other',
  airtime_data: 'airtime',
  reversal: 'other',
};

type Categorizable = Pick<Transaction, 'type' | 'counterpartyName' | 'counterpartyNumber'>;

export function counterpartyKey(tx: Pick<Transaction, 'counterpartyName' | 'counterpartyNumber'>): string | undefined {
  return tx.counterpartyNumber ?? tx.counterpartyName?.toUpperCase();
}

// FR-3.2 rule order: user rules → counterparty memory → keyword rules → type-based default.
// User and counterparty rules are both 'counterparty' rules; user-created ones win on priority.
export function categorize(tx: Categorizable, rules: CategoryRule[]): string {
  const key = counterpartyKey(tx);
  const name = tx.counterpartyName?.toUpperCase() ?? '';
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of ordered) {
    if (rule.matchType === 'counterparty' && key && rule.pattern === key) return rule.categoryId;
    if (rule.matchType === 'keyword' && name && new RegExp(rule.pattern, 'i').test(name)) return rule.categoryId;
    if (rule.matchType === 'type' && rule.pattern === tx.type) return rule.categoryId;
  }
  // Money coming in is income regardless of keywords.
  return TYPE_DEFAULTS[tx.type];
}
