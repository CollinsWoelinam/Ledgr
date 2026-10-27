import type { Transaction } from '@/db/schema';
import { ensureDefaults, loadLedger } from '@/db/repositories/ledger';
import { openTestDb } from '@/db/testing/nodeDb';
import { flushLedgerWrites, useLedger } from './ledger';

const sms = (id: string, name: string, at: number): Omit<Transaction, 'categoryId'> => ({
  id, provider: 'mtn_momo', type: 'payment', direction: 'out', amountMinor: 1000, feeMinor: 0, taxMinor: 0, currency: 'GHS', externalRef: id, counterpartyName: name, occurredAt: at, source: 'sms',
});

async function ledger() {
  const db = await openTestDb();
  await ensureDefaults(db);
  await useLedger.getState().attach(db, false);
  useLedger.getState().ingest([sms('a', 'MAKOLA SUPPLIES', 1), sms('b', 'MAKOLA SUPPLIES', 2), sms('c', 'KFC OSU', 3)], []);
  return db;
}

test('one transaction can be marked business, and back', async () => {
  const db = await ledger();
  expect(useLedger.getState().setBusiness('a', true, false)).toBe(1);
  await flushLedgerWrites();
  expect((await loadLedger(db)).transactions.filter((t) => t.business).map((t) => t.id)).toEqual(['a']);
  useLedger.getState().setBusiness('a', false, false);
  await flushLedgerWrites();
  expect((await loadLedger(db)).transactions.some((t) => t.business)).toBe(false);
});

test('marking everything from a supplier also marks their future transactions', async () => {
  const db = await ledger();
  expect(useLedger.getState().setBusiness('a', true, true)).toBe(2);
  useLedger.getState().ingest([sms('d', 'Makola Supplies', 4), sms('e', 'KFC OSU', 5)], []);
  await flushLedgerWrites();
  const stored = await loadLedger(db);
  expect(stored.transactions.filter((t) => t.business).map((t) => t.id).sort()).toEqual(['a', 'b', 'd']);
  expect(stored.businessCounterparties).toEqual(['MAKOLA SUPPLIES']);
});

test('a manual entry can be business', () => {
  useLedger.getState().reset();
  const id = useLedger.getState().saveManual({ provider: 'cash', direction: 'out', amountMinor: 500, feeMinor: 0, name: 'Stock', categoryId: 'shopping', occurredAt: 1, business: true });
  expect(useLedger.getState().transactions.find((t) => t.id === id)?.business).toBe(true);
});
