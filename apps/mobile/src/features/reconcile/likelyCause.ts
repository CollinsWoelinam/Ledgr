import type { TransactionType } from '@ledgr/parser';
import type { BalanceGap } from './balanceGaps';

// What a guessed transaction type is called on a gap card, and how Record fills it in.
const TYPES: Partial<Record<TransactionType, { noun: string; name: string; categoryId: string }>> = {
  cash_out: { noun: 'cash-out', name: 'Cash withdrawal', categoryId: 'cash' },
  transfer_out: { noun: 'transfer', name: 'Transfer', categoryId: 'transfers' },
  payment: { noun: 'payment', name: 'Payment', categoryId: 'other' },
  airtime_data: { noun: 'airtime or data purchase', name: 'Airtime or data', categoryId: 'airtime' },
};

export const causeNoun = (type: TransactionType) => TYPES[type]?.noun ?? 'transaction';

// The charge rate as people say it: "1%", "0.75%", "3.8%".
export const ratePercent = (chargesMinor: number, amountMinor: number) => `${Number(((chargesMinor / amountMinor) * 100).toFixed(2))}%`;

export interface GapRecordDefaults {
  name: string;
  categoryId: string;
  at?: number;
  type?: TransactionType;
  feeMinor?: number;
}

// Record's starting point: the likely cause when there is one, otherwise a blank "Missing SMS".
export function recordDefaults(gap: BalanceGap): GapRecordDefaults {
  const out = gap.amountMinor < 0;
  const likely = gap.likely;
  if (likely?.kind === 'airtime') return { name: 'MTN Airtime', categoryId: 'airtime', at: likely.at, type: 'airtime_data' };
  if (likely?.kind === 'charged') {
    const t = TYPES[likely.type];
    return { name: t?.name ?? '', categoryId: t?.categoryId ?? 'other', type: likely.type, feeMinor: likely.chargesMinor };
  }
  return { name: '', categoryId: out ? 'other' : 'income' };
}
