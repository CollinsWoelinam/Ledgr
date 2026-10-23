import type { Transaction } from '@/db/schema';
import { seedDemoData } from '@/demo/seed';
import { chargedMatch, findBalanceGaps } from './balanceGaps';

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
  expect(findBalanceGaps([a, b])).toEqual([
    {
      key: `${a.id}>${b.id}`, provider: 'mtn_momo', amountMinor: -2120, from: a.occurredAt, to: b.occurredAt,
      // The working shown on the card: 100.00 − 10.00 explained = 90.00 expected, 68.80 reported.
      startBalanceMinor: 10000, explainedMinor: -1000, expectedMinor: 9000, reportedMinor: 6880, clues: [], likely: undefined,
    },
  ]);
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

const ev = (kind: 'airtime_topup' | 'login', at: number, extra: { amountMinor?: number } = {}) => ({ id: `ev${++n}`, provider: 'mtn_momo', kind, at, ...extra });

test('an airtime notice matching the missing amount is the likely cause', () => {
  const a = tx('in', 3000, 3000, 0);
  const b = tx('out', 500, 2000, 7 * 24 * 60 * MIN); // 3000 − 500 = 2500 expected: 500 missing
  const notice = ev('airtime_topup', 3 * 24 * 60 * MIN, { amountMinor: 500 });
  const [gap] = findBalanceGaps([a, b], [notice]);
  expect(gap?.likely).toEqual({ kind: 'airtime', amountMinor: 500, at: notice.at });
  expect(gap?.clues).toEqual([notice]);
});

test('an airtime notice that does not match is a clue, not the likely cause', () => {
  const [gap] = findBalanceGaps([tx('in', 3000, 3000, 0), tx('out', 500, 1000, 7 * 24 * 60 * MIN)], [ev('airtime_topup', 60 * MIN, { amountMinor: 500 })]);
  expect(gap?.likely).toBeUndefined();
  expect(gap?.clues).toHaveLength(1);
});

test('an airtime notice with its MoMo receipt is not a clue', () => {
  const a = tx('in', 3000, 3000, 0);
  const bought = tx('out', 500, 2500, 60 * MIN);
  const b = tx('out', 500, 1500, 7 * 24 * 60 * MIN); // 500 missing
  const [gap] = findBalanceGaps([a, bought, b], [ev('airtime_topup', 62 * MIN, { amountMinor: 500 })]);
  expect(gap?.clues).toEqual([]);
  expect(gap?.likely).toBeUndefined();
});

test('logins inside the window are clues', () => {
  const login = ev('login', 2 * 60 * MIN);
  const [gap] = findBalanceGaps([tx('in', 1000, 1000, 0), tx('in', 100, 900, 24 * 60 * MIN)], [login]);
  expect(gap?.clues).toEqual([login]);
});

describe('guessing a round amount plus charges', () => {
  const DAY = 24 * 60 * MIN;
  // Two GHS 60 cash-outs at 1%: an established tariff.
  const history = () => [
    tx('in', 50000, 50000, 0),
    tx('out', 6000, 43940, 1 * DAY, { type: 'cash_out', feeMinor: 60 }),
    tx('out', 6000, 37880, 2 * DAY, { type: 'cash_out', feeMinor: 60 }),
  ];

  test('GHS 121.20 missing reads as a GHS 120 cash-out at the 1% this wallet charged', () => {
    const [gap] = findBalanceGaps([...history(), tx('out', 1000, 37880 - 1000 - 12120, 5 * DAY)]);
    expect(gap?.amountMinor).toBe(-12120);
    expect(gap?.likely).toMatchObject({ kind: 'charged', type: 'cash_out', amountMinor: 12000, chargesMinor: 120 });
  });

  test('no guess when nothing adds up exactly', () => {
    const [gap] = findBalanceGaps([...history(), tx('out', 1000, 37880 - 1000 - 12137, 5 * DAY)]);
    expect(gap?.likely).toBeUndefined();
  });

  test('a rate seen only once is not a tariff', () => {
    const once = history().slice(0, 2);
    const [gap] = findBalanceGaps([...once, tx('out', 1000, 43940 - 1000 - 12120, 5 * DAY)]);
    expect(gap?.likely).toBeUndefined();
  });

  test('no guess for small gaps or charges from more than a year away', () => {
    expect(chargedMatch({ amountMinor: -404, to: 3 * DAY }, history())).toBeUndefined(); // 4 + 1% would fit
    expect(chargedMatch({ amountMinor: -12120, to: 400 * DAY }, history())).toBeUndefined();
  });
});
