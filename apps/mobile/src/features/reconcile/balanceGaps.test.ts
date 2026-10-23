import type { Transaction } from '@/db/schema';
import { seedDemoData } from '@/demo/seed';
import { findBalanceGaps } from './balanceGaps';

const MIN = 60_000;
let n = 0;
const tx = (direction: 'in' | 'out', amount: number, balance: number | undefined, at: number, extra: Partial<Transaction> = {}): Transaction => ({
  id: `t${++n}`, provider: 'mtn_momo', type: direction === 'in' ? 'transfer_in' : 'payment', direction, amountMinor: amount, feeMinor: 0, taxMinor: 0,
  currency: 'GHS', balanceAfterMinor: balance, occurredAt: at, categoryId: 'other', source: 'sms', ...extra,
});

test('a consistent chain has no gaps (fees and taxes included)', () => {
  expect(findBalanceGaps([tx('in', 10000, 10000, 0), tx('out', 2000, 7950, 60 * MIN, { feeMinor: 30, taxMinor: 20 }), tx('in', 500, 8450, 120 * MIN)])).toEqual([]);
});

test('money that left with no message shows as a negative gap between the two transactions', () => {
  const a = tx('in', 10000, 10000, 0);
  const b = tx('out', 1000, 6880, 24 * 60 * MIN); // 10000 − 1000 should be 9000: 2,120 went missing
  expect(findBalanceGaps([a, b])).toEqual([{ key: `${a.id}>${b.id}`, provider: 'mtn_momo', amountMinor: -2120, from: a.occurredAt, to: b.occurredAt }]);
});

test('messages texted out of order within a burst are reordered, not flagged', () => {
  const start = tx('in', 1000, 1000, 0);
  // Real order: +500 (→1500), then −200 (→1300). Delivered the other way round, minutes apart.
  const late = tx('out', 200, 1300, 10 * MIN);
  const early = tx('in', 500, 1500, 12 * MIN);
  expect(findBalanceGaps([start, late, early])).toEqual([]);
});

test('gaps that cancel out within a day are late SMS, not missing money', () => {
  // Real order: +100 → 1100, +200 → 1300, +300 → 1600, +50 → 1650. The +300 message arrived hours early
  // relative to the others' timestamps, so walking by time sees +300, then +100, +200, +50.
  const a = tx('in', 1000, 1000, 0);
  const late300 = tx('in', 300, 1600, 7 * 60 * MIN);
  const b100 = tx('in', 100, 1100, 9 * 60 * MIN);
  const c200 = tx('in', 200, 1300, 10 * 60 * MIN);
  const d50 = tx('in', 50, 1650, 11 * 60 * MIN);
  expect(findBalanceGaps([a, late300, b100, c200, d50])).toEqual([]);
});

test('each wallet has its own balance', () => {
  expect(findBalanceGaps([tx('in', 1000, 1000, 0), tx('in', 500, 500, MIN, { provider: 'telecel_cash' }), tx('in', 100, 1100, 2 * MIN)])).toEqual([]);
});

test('a recorded adjustment (no balance of its own) closes the gap', () => {
  const a = tx('in', 10000, 10000, 0);
  const fix = tx('out', 2120, undefined, 12 * 60 * MIN, { source: 'manual' });
  const b = tx('out', 1000, 6880, 24 * 60 * MIN);
  expect(findBalanceGaps([a, fix, b])).toEqual([]);
});

test('demo data has no gaps', () => {
  const { transactions } = seedDemoData(new Date(2026, 9, 22, 12));
  expect(findBalanceGaps(transactions.map((t) => ({ ...t, categoryId: 'other' })))).toEqual([]);
});
