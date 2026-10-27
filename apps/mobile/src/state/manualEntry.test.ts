import type { Transaction } from '@/db/schema';
import { ensureDefaults, loadLedger } from '@/db/repositories/ledger';
import { openTestDb } from '@/db/testing/nodeDb';
import { findBalanceGaps } from '@/features/reconcile/balanceGaps';
import { flushLedgerWrites, useLedger, type ManualEntry } from './ledger';

const DAY = 86_400_000;
const entry = (over: Partial<ManualEntry> = {}): ManualEntry => ({ provider: 'cash', direction: 'out', amountMinor: 2500, feeMinor: 0, name: 'Kenkey', categoryId: 'food', occurredAt: 5 * DAY, ...over });
const sms = (id: string, amountMinor: number, balance: number, at: number, direction: 'in' | 'out' = 'out'): Omit<Transaction, 'categoryId'> => ({
  id, provider: 'mtn_momo', type: direction === 'in' ? 'transfer_in' : 'transfer_out', direction, amountMinor, feeMinor: 0, taxMinor: 0, currency: 'GHS',
  externalRef: id, counterpartyName: 'KWAME MENSAH', balanceAfterMinor: balance, occurredAt: at, source: 'sms',
});

async function ledger() {
  const db = await openTestDb();
  await ensureDefaults(db);
  await useLedger.getState().attach(db, false);
  return db;
}

test('a manual entry is saved with its wallet, category and time, and survives a restart', async () => {
  const db = await ledger();
  const id = useLedger.getState().saveManual(entry());
  await flushLedgerWrites();
  expect((await loadLedger(db)).transactions.find((t) => t.id === id)).toMatchObject({ provider: 'cash', direction: 'out', amountMinor: 2500, counterpartyName: 'Kenkey', categoryId: 'food', source: 'manual', occurredAt: 5 * DAY });
});

test('editing rewrites the same entry; deleting removes it', async () => {
  const db = await ledger();
  const id = useLedger.getState().saveManual(entry());
  useLedger.getState().saveManual(entry({ amountMinor: 3000, name: 'Waakye', categoryId: 'food' }), id);
  await flushLedgerWrites();
  const stored = (await loadLedger(db)).transactions.filter((t) => t.source === 'manual');
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ id, amountMinor: 3000, counterpartyName: 'Waakye' });

  useLedger.getState().deleteTransaction(id);
  await flushLedgerWrites();
  expect((await loadLedger(db)).transactions).toHaveLength(0);
});

test('SMS transactions cannot be deleted', async () => {
  await ledger();
  useLedger.getState().ingest([sms('a', 1000, 9000, DAY)], []);
  useLedger.getState().deleteTransaction('a');
  expect(useLedger.getState().transactions).toHaveLength(1);
});

test('an entry for a MoMo movement with no SMS closes the balance gap', async () => {
  await ledger();
  useLedger.getState().ingest([sms('a', 10000, 10000, 0, 'in'), sms('b', 1000, 7000, 2 * DAY)], []); // 2,000 left with no SMS
  expect(findBalanceGaps(useLedger.getState().transactions)).toHaveLength(1);
  useLedger.getState().saveManual(entry({ provider: 'mtn_momo', amountMinor: 2000, occurredAt: DAY, categoryId: 'transfers' }));
  expect(findBalanceGaps(useLedger.getState().transactions)).toEqual([]);
});

test('when the SMS turns up later, it replaces your entry and keeps your category', async () => {
  const db = await ledger();
  useLedger.getState().saveManual(entry({ provider: 'mtn_momo', amountMinor: 2000, occurredAt: DAY, categoryId: 'savings', name: 'Susu' }));
  useLedger.getState().ingest([sms('late', 2000, 8000, DAY + 3600_000)], []);
  await flushLedgerWrites();
  const stored = (await loadLedger(db)).transactions;
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ id: 'late', source: 'sms', categoryId: 'savings' });
});

test('cash entries are never replaced by wallet SMS', async () => {
  await ledger();
  useLedger.getState().saveManual(entry({ amountMinor: 2000, occurredAt: DAY }));
  useLedger.getState().ingest([sms('x', 2000, 8000, DAY)], []);
  expect(useLedger.getState().transactions).toHaveLength(2);
});
