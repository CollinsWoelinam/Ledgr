import type { Transaction } from '@/db/schema';
import { ensureDefaults, loadLedger } from '@/db/repositories/ledger';
import { openTestDb } from '@/db/testing/nodeDb';
import { summarize } from '@/features/insights/queries';
import { flushLedgerWrites, useLedger } from '@/state/ledger';
import { findBalanceGaps } from './balanceGaps';

const DAY = 86_400_000;
const tx = (id: string, direction: 'in' | 'out', amount: number, balance: number, at: number): Omit<Transaction, 'categoryId'> => ({
  id, provider: 'mtn_momo', type: direction === 'in' ? 'transfer_in' : 'payment', direction, amountMinor: amount, feeMinor: 0, taxMinor: 0,
  currency: 'GHS', externalRef: id, balanceAfterMinor: balance, occurredAt: at, source: 'sms',
});

async function ledgerWithGap() {
  const db = await openTestDb();
  await ensureDefaults(db);
  await useLedger.getState().attach(db, false);
  // 100.00 in, then a 10.00 payment reported with 77.88 left: 12.12 left with no SMS.
  useLedger.getState().ingest([tx('a', 'in', 10000, 10000, 0), tx('b', 'out', 1000, 7788, 2 * DAY)], []);
  await flushLedgerWrites();
  return db;
}

test('recording a gap adds an unexplained transaction that closes it and counts as spending', async () => {
  const db = await ledgerWithGap();
  const [gap] = findBalanceGaps(useLedger.getState().transactions);
  expect(gap?.amountMinor).toBe(-1212);

  useLedger.getState().recordGap(gap!, { name: 'Rent via MoMo app', categoryId: 'bills' });
  await flushLedgerWrites();
  const stored = await loadLedger(db);
  const fix = stored.transactions.find((t) => t.source === 'manual')!;
  expect(fix).toMatchObject({ direction: 'out', amountMinor: 1212, counterpartyName: 'Rent via MoMo app', categoryId: 'bills', provider: 'mtn_momo' });
  expect(fix.occurredAt).toBeGreaterThan(0);
  expect(fix.occurredAt).toBeLessThan(2 * DAY);
  expect(findBalanceGaps(stored.transactions)).toEqual([]);
  expect(summarize(stored.transactions, { start: 0, end: 3 * DAY }).outMinor).toBe(1000 + 1212);

  // Recording twice doesn't add it twice.
  useLedger.getState().recordGap(gap!);
  await flushLedgerWrites();
  expect((await loadLedger(db)).transactions.filter((t) => t.source === 'manual')).toHaveLength(1);
});

test('ignoring a gap is remembered across launches, and Delete all data clears it', async () => {
  const db = await ledgerWithGap();
  const [gap] = findBalanceGaps(useLedger.getState().transactions);
  useLedger.getState().ignoreGap(gap!.key);
  await flushLedgerWrites();
  expect((await loadLedger(db)).dismissedGaps).toEqual([gap!.key]);

  useLedger.getState().reset();
  await flushLedgerWrites();
  expect((await loadLedger(db)).dismissedGaps).toEqual([]);
});

test('recording without details names it "Missing SMS"', async () => {
  await ledgerWithGap();
  const [gap] = findBalanceGaps(useLedger.getState().transactions);
  useLedger.getState().recordGap(gap!);
  expect(useLedger.getState().transactions.find((t) => t.source === 'manual')?.counterpartyName).toBe('Missing SMS');
});

test('recording a guessed cash-out splits out the charges, still closing the gap exactly', async () => {
  const db = await ledgerWithGap();
  const [gap] = findBalanceGaps(useLedger.getState().transactions);
  useLedger.getState().recordGap(gap!, { name: 'Cash withdrawal', categoryId: 'cash', type: 'cash_out', feeMinor: 12 });
  await flushLedgerWrites();
  const stored = await loadLedger(db);
  expect(stored.transactions.find((t) => t.source === 'manual')).toMatchObject({ type: 'cash_out', amountMinor: 1200, feeMinor: 12, categoryId: 'cash' });
  expect(findBalanceGaps(stored.transactions)).toEqual([]);
});

test('an ignored gap can be restored, also after a restart', async () => {
  const db = await ledgerWithGap();
  const [gap] = findBalanceGaps(useLedger.getState().transactions);
  useLedger.getState().ignoreGap(gap!.key);
  useLedger.getState().restoreGap(gap!.key);
  await flushLedgerWrites();
  expect(useLedger.getState().dismissedGaps).toEqual([]);
  expect((await loadLedger(db)).dismissedGaps).toEqual([]);
});
