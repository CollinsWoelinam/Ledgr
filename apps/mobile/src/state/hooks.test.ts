import type { Transaction } from '@/db/schema';
import { summarize, latestBalance } from '@/features/insights/queries';
import { selectWallet, walletsIn } from './hooks';

const tx = (provider: string, amountMinor: number, balanceAfterMinor: number, occurredAt: number): Transaction => ({
  id: `${provider}-${occurredAt}`, provider, type: 'payment', direction: 'out', amountMinor, feeMinor: 0, taxMinor: 0,
  currency: 'GHS', occurredAt, balanceAfterMinor, categoryId: 'other', source: 'sms',
});
const data = [tx('mtn_momo', 1000, 3300, 3), tx('telecel_cash', 500, 14640, 2), tx('mtn_momo', 200, 4300, 1)];
const period = { start: 0, end: 10 };

test('wallets are the providers that have transactions, in provider order', () => {
  expect(walletsIn(data)).toEqual([{ id: 'mtn_momo', name: 'MTN MoMo' }, { id: 'telecel_cash', name: 'Telecel Cash' }]);
  expect(walletsIn([data[0]!])).toHaveLength(1);
});

test('one wallet: totals and balance cover only that wallet', () => {
  const { transactions, wallet } = selectWallet(data, walletsIn(data), 'telecel_cash');
  expect(wallet?.name).toBe('Telecel Cash');
  expect(summarize(transactions, period).outMinor).toBe(500);
  expect(latestBalance(transactions)).toBe(14640);
});

test('all wallets: everything, balance summed across wallets', () => {
  const { transactions, wallet } = selectWallet(data, walletsIn(data), 'all');
  expect(wallet).toBeNull();
  expect(summarize(transactions, period).outMinor).toBe(1700);
  expect(latestBalance(transactions)).toBe(3300 + 14640);
});

test('a remembered wallet that no longer has transactions falls back to all', () => {
  const mtnOnly = data.filter((t) => t.provider === 'mtn_momo');
  expect(selectWallet(mtnOnly, walletsIn(mtnOnly), 'telecel_cash')).toEqual({ transactions: mtnOnly, wallet: null });
});
