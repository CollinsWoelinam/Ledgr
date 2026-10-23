import { loadLedger } from '@/db/repositories/ledger';
import { openTestDb } from '@/db/testing/nodeDb';
import { flushLedgerWrites, useLedger } from './ledger';

// The store writes through to SQLite: what the user changes must be there after a "restart" (a fresh load).
test('changes survive a reload from the database', async () => {
  const db = await openTestDb();
  await useLedger.getState().attach(db, false);
  const s = useLedger.getState();
  s.loadDemo();

  const akos = useLedger.getState().transactions.find((t) => t.counterpartyName === 'AUNTIE AKOS KITCHEN')!;
  s.setCategory(akos.id, 'savings', true);
  s.setBudget('bills', 25000);
  s.dismissReview('rv-1');
  s.addCategory({ name: 'Church', icon: 'pricetag-outline', color: '#8B5CF6', kind: 'expense' });
  await flushLedgerWrites();

  const reloaded = await loadLedger(db);
  const memory = useLedger.getState();
  expect(reloaded.transactions).toEqual(memory.transactions.slice().sort((a, b) => b.occurredAt - a.occurredAt));
  expect(reloaded.transactions.filter((t) => t.counterpartyName === 'AUNTIE AKOS KITCHEN').every((t) => t.categoryId === 'savings')).toBe(true);
  expect(reloaded.rules.find((r) => r.createdBy === 'user')).toMatchObject({ pattern: akos.counterpartyNumber, categoryId: 'savings' });
  expect(reloaded.budgets).toEqual(expect.arrayContaining([{ categoryId: 'bills', amountMinor: 25000 }]));
  expect(reloaded.reviewQueue.map((r) => r.id)).toEqual(['rv-2']);
  expect(reloaded.categories.map((c) => c.name)).toContain('Church');

  s.reset();
  await flushLedgerWrites();
  expect((await loadLedger(db)).transactions).toEqual([]);
});
