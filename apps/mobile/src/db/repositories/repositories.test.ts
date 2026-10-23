import { seedDemoData } from '@/demo/seed';
import { categorize } from '@/features/categorization/categorize';
import { SYSTEM_RULES } from '@/features/categorization/defaultCategories';
import { MIGRATIONS } from '../migrations';
import type { SqlDb } from '../sql';
import { openTestDb } from '../testing/nodeDb';
import { listBudgets, setBudget } from './budgets';
import { deleteCategory, listCategories, listRules, upsertRule } from './categories';
import { ensureDefaults, loadLedger, wipeLedger } from './ledger';
import { addReviewItems, listReviewItems, removeReviewItem } from './reviewQueue';
import { countTransactions, insertTransactions, listTransactions, moveCategory } from './transactions';

const demo = () => seedDemoData(new Date(2026, 9, 22, 12)).transactions.map((t) => ({ ...t, categoryId: categorize(t, SYSTEM_RULES) }));

let db: SqlDb;
beforeEach(async () => {
  db = await openTestDb();
  await ensureDefaults(db);
});

test('migrations set the schema version', async () => {
  expect(await db.get('PRAGMA user_version')).toEqual({ user_version: MIGRATIONS.length });
});

test('system rules are refreshed on launch without touching user rules', async () => {
  await db.run("UPDATE category_rules SET pattern = 'OLD' WHERE id = 'sys-0'");
  await upsertRule(db, { id: 'user-X', matchType: 'counterparty', pattern: 'X', categoryId: 'food', priority: 0, createdBy: 'user' });
  await ensureDefaults(db);
  const rules = await listRules(db);
  expect(rules.find((r) => r.id === 'sys-0')?.pattern).toBe(SYSTEM_RULES[0]!.pattern);
  expect(rules.find((r) => r.id === 'user-X')).toBeDefined();
});

test('defaults are installed once', async () => {
  await ensureDefaults(db);
  expect(await listCategories(db)).toHaveLength(10);
  expect(await listRules(db)).toHaveLength(SYSTEM_RULES.length);
});

test('transactions round-trip every field, newest first', async () => {
  const txs = demo();
  expect(await insertTransactions(db, txs)).toBe(txs.length);
  const stored = await listTransactions(db);
  expect(stored).toEqual([...txs].sort((a, b) => b.occurredAt - a.occurredAt));
});

test('duplicates are skipped by dedupe key (FR-2.3)', async () => {
  const txs = demo();
  await insertTransactions(db, txs);
  const again = txs.slice(0, 5).map((t) => ({ ...t, id: `${t.id}-dup` }));
  expect(await insertTransactions(db, again)).toBe(0);
  expect(await countTransactions(db)).toBe(txs.length);
});

test('budgets: overall and per category, set, update and remove', async () => {
  await setBudget(db, null, 300000);
  await setBudget(db, 'food', 60000);
  await setBudget(db, 'food', 50000);
  expect(await listBudgets(db)).toEqual(expect.arrayContaining([{ categoryId: null, amountMinor: 300000 }, { categoryId: 'food', amountMinor: 50000 }]));
  await setBudget(db, 'food', null);
  expect(await listBudgets(db)).toEqual([{ categoryId: null, amountMinor: 300000 }]);
});

test('deleting a category cascades its rules and budget after its transactions move', async () => {
  await insertTransactions(db, demo());
  await setBudget(db, 'food', 60000);
  await upsertRule(db, { id: 'u1', matchType: 'counterparty', pattern: 'X', categoryId: 'food', priority: 0, createdBy: 'user' });
  await moveCategory(db, 'food', 'other');
  await deleteCategory(db, 'food');
  const { transactions, budgets, rules, categories } = await loadLedger(db);
  expect(categories.some((c) => c.id === 'food')).toBe(false);
  expect(transactions.some((t) => t.categoryId === 'food')).toBe(false);
  expect(budgets.some((b) => b.categoryId === 'food')).toBe(false);
  expect(rules.some((r) => r.categoryId === 'food')).toBe(false);
});

test('foreign keys reject a transaction in an unknown category', async () => {
  const [t] = demo();
  await expect(insertTransactions(db, [{ ...t!, categoryId: 'nope' }])).rejects.toThrow();
  expect(await countTransactions(db)).toBe(0);
});

test('review items: add, list newest first, resolve deletes the text', async () => {
  await addReviewItems(db, [
    { id: 'a', sender: 'MobileMoney', body: 'old', receivedAt: 1 },
    { id: 'b', sender: 'MobileMoney', body: 'new', receivedAt: 2 },
  ]);
  expect((await listReviewItems(db)).map((r) => r.id)).toEqual(['b', 'a']);
  await removeReviewItem(db, 'b');
  expect(await db.get('SELECT body FROM review_queue WHERE id = ?', ['b'])).toBeNull();
});

test('wipe removes everything and restores defaults (FR-6.3)', async () => {
  await insertTransactions(db, demo());
  await setBudget(db, null, 1000);
  await wipeLedger(db);
  const snapshot = await loadLedger(db);
  expect(snapshot.transactions).toEqual([]);
  expect(snapshot.budgets).toEqual([]);
  expect(snapshot.categories).toHaveLength(10);
});
