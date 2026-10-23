import type { Transaction } from '@/db/schema';
import { dailySpend, latestBalance, spendByCategory, summarize, topCounterparties } from './queries';

const period = { start: new Date(2026, 9, 1).getTime(), end: new Date(2026, 10, 1).getTime() };
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
let n = 0;
const tx = (p: Partial<Transaction>): Transaction => ({
  id: String(++n), provider: 'mtn_momo', type: 'payment', direction: 'out', amountMinor: 1000, feeMinor: 0, taxMinor: 0,
  currency: 'GHS', occurredAt: at(5), categoryId: 'food', source: 'demo', ...p,
});

const data = [
  tx({ amountMinor: 1000, feeMinor: 10, counterpartyName: 'A', balanceAfterMinor: 5000, occurredAt: at(3) }),
  tx({ amountMinor: 3000, taxMinor: 30, categoryId: 'bills', counterpartyName: 'B', balanceAfterMinor: 2000, occurredAt: at(4) }),
  tx({ amountMinor: 500, counterpartyName: 'A', occurredAt: at(4, 23) }),
  tx({ direction: 'in', type: 'transfer_in', amountMinor: 9000, categoryId: 'income', occurredAt: at(6) }),
  tx({ amountMinor: 99999, occurredAt: new Date(2026, 8, 30).getTime() }), // previous month
];

test('summarize splits in/out and adds fees and taxes', () => {
  expect(summarize(data, period)).toEqual({ outMinor: 4500, inMinor: 9000, feesMinor: 40, count: 4 });
});

test('latest balance comes from the newest transaction that has one', () => {
  expect(latestBalance(data)).toBe(2000);
});

test('spend by category is outgoing only, largest first', () => {
  expect(spendByCategory(data, period)).toEqual([{ categoryId: 'bills', amountMinor: 3000 }, { categoryId: 'food', amountMinor: 1500 }]);
});

test('daily spend has one bucket per day', () => {
  const days = dailySpend(data, period);
  expect(days).toHaveLength(31);
  expect(days[3]!.amountMinor).toBe(3500); // Oct 4, including 23:00
});

test('top counterparties aggregate by name', () => {
  expect(topCounterparties(data, period)).toEqual([
    { name: 'B', amountMinor: 3000, count: 1 },
    { name: 'A', amountMinor: 1500, count: 2 },
  ]);
});

test('balance adds up the latest balance of each wallet', () => {
  const mtn = tx({ provider: 'mtn_momo', balanceAfterMinor: 7300, occurredAt: at(20) });
  const older = tx({ provider: 'mtn_momo', balanceAfterMinor: 9999, occurredAt: at(2) });
  const telecel = tx({ provider: 'telecel_cash', balanceAfterMinor: 73, occurredAt: at(21) });
  expect(latestBalance([mtn, older, telecel])).toBe(7373);
});
