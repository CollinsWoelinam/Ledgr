import type { Transaction } from '@/db/schema';
import { spendByCategory, summarize } from '@/features/insights/queries';
import { drawDownCash } from './pocket';

const DAY = 86_400_000;
const tx = (id: string, provider: string, amountMinor: number, occurredAt: number, categoryId: string): Transaction => ({
  id, provider, type: 'payment', direction: 'out', amountMinor, feeMinor: 0, taxMinor: 0, currency: 'GHS', occurredAt, categoryId, source: provider === 'cash' ? 'manual' : 'sms',
});
const period = { start: 0, end: 30 * DAY };

test('recorded cash spending moves out of Cash withdrawals: the total stays the same', () => {
  const data = [tx('w', 'mtn_momo', 20000, 1 * DAY, 'cash'), tx('lunch', 'cash', 5000, 2 * DAY, 'food'), tx('taxi', 'cash', 3000, 3 * DAY, 'transport')];
  expect(summarize(data, period).outMinor).toBe(20000);
  expect(spendByCategory(data, period)).toEqual([
    { categoryId: 'cash', amountMinor: 12000 },
    { categoryId: 'food', amountMinor: 5000 },
    { categoryId: 'transport', amountMinor: 3000 },
  ]);
});

test('the most recent earlier withdrawal first, then older ones; later ones are untouched', () => {
  const data = [tx('old', 'mtn_momo', 5000, 1 * DAY, 'cash'), tx('recent', 'mtn_momo', 5000, 2 * DAY, 'cash'), tx('later', 'mtn_momo', 5000, 9 * DAY, 'cash'), tx('s', 'cash', 7000, 3 * DAY, 'food')];
  const out = drawDownCash(data);
  expect(out.find((t) => t.id === 'recent')?.amountMinor).toBe(0);
  expect(out.find((t) => t.id === 'old')?.amountMinor).toBe(3000);
  expect(out.find((t) => t.id === 'later')?.amountMinor).toBe(5000);
});

test('cash spent beyond earlier withdrawals counts in full', () => {
  const data = [tx('w', 'mtn_momo', 5000, 1 * DAY, 'cash'), tx('s', 'cash', 7000, 3 * DAY, 'food')];
  expect(summarize(data, period).outMinor).toBe(7000);
});

test('this month’s cash comes from this month’s withdrawal, not one from years ago', () => {
  const data = [tx('2022', 'mtn_momo', 10000, -900 * DAY, 'cash'), tx('oct', 'mtn_momo', 65000, 10 * DAY, 'cash'), tx('s', 'cash', 500, 20 * DAY, 'food')];
  expect(summarize(data, period).outMinor).toBe(65000);
});

test('without recorded cash, nothing changes', () => {
  const data = [tx('w', 'mtn_momo', 20000, DAY, 'cash')];
  expect(drawDownCash(data)).toBe(data);
});
