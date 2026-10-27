import { DEFAULT_CATEGORIES, SYSTEM_RULES } from '@/features/categorization/defaultCategories';
import { MIGRATIONS, migrate } from './migrations';
import { ensureDefaults, loadLedger } from './repositories/ledger';
import { upsertCategory, upsertRule } from './repositories/categories';
import { openTestDb } from './testing/nodeDb';

const V1_CATEGORIES = DEFAULT_CATEGORIES.filter((c) => c.id !== 'cash' && c.id !== 'bank');
const now = Date.now();
const tx = (id: string, type: string, name: string, category: string) =>
  [id, 'mtn_momo', id, type, 'out', 1000, 0, 0, 'GHS', name, null, null, now, category, 'sms', null, id, now, now];
const INSERT =
  'INSERT INTO transactions (id, provider, external_ref, type, direction, amount_minor, fee_minor, tax_minor, currency, counterparty_name, ' +
  'counterparty_number, balance_after_minor, occurred_at, category_id, source, sms_body, dedupe_key, created_at, updated_at) VALUES (' +
  Array(19).fill('?').join(', ') + ')';

// An install from before v2: ten categories, old rules, everything below categorized as the old rules did.
async function v1Install() {
  const db = await openTestDb(1);
  for (const [i, c] of V1_CATEGORIES.entries()) await upsertCategory(db, c, i);
  for (const r of SYSTEM_RULES.filter((r) => r.categoryId !== 'bank')) await upsertRule(db, r);
  await db.run(INSERT, tx('bankpush', 'payment', 'BANKPUSH', 'other'));
  await db.run(INSERT, tx('cashout', 'cash_out', "TONY'S FASHION HOME", 'other'));
  await db.run(INSERT, tx('church', 'payment', 'LOVE REIGN BIBLE CHURCH -HO', 'other'));
  await db.run(INSERT, tx('bills', 'payment', 'Bills.INV', 'other'));
  // The user put this cash-out in Shopping themselves; the upgrade must leave it alone.
  await db.run(INSERT, tx('chosen', 'cash_out', 'GRACE MINI SHOP', 'shopping'));
  return db;
}

test('upgrading a v1 install adds the categories and re-sorts what was stuck in Other', async () => {
  const db = await v1Install();
  await migrate(db);
  await ensureDefaults(db);
  const { categories, transactions, rules } = await loadLedger(db);
  const byId = Object.fromEntries(transactions.map((t) => [t.id, t.categoryId]));

  expect(categories.map((c) => c.id)).toEqual(['food', 'transport', 'airtime', 'bills', 'shopping', 'transfers', 'income', 'fees', 'savings', 'cash', 'bank', 'other']);
  expect(byId).toEqual({ bankpush: 'bank', cashout: 'cash', church: 'other', bills: 'bills', chosen: 'shopping' });
  expect(rules.some((r) => r.categoryId === 'bank')).toBe(true);
  expect(await db.get('PRAGMA user_version')).toEqual({ user_version: MIGRATIONS.length });
});

test('the upgrade runs once: a later move back to Other sticks', async () => {
  const db = await v1Install();
  await migrate(db);
  await db.run("UPDATE transactions SET category_id = 'other' WHERE id = 'bankpush'");
  await migrate(db);
  expect(await db.get("SELECT category_id FROM transactions WHERE id = 'bankpush'")).toEqual({ category_id: 'other' });
});

test('a fresh install gets all twelve categories exactly once', async () => {
  const db = await openTestDb();
  await ensureDefaults(db);
  await ensureDefaults(db);
  expect((await loadLedger(db)).categories.map((c) => c.id)).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
});

test('upgrading to v5 keeps every transaction, all personal', async () => {
  const db = await v1Install();
  await migrate(db);
  const { transactions, businessCounterparties } = await loadLedger(db);
  expect(transactions).toHaveLength(5);
  expect(transactions.some((t) => t.business)).toBe(false);
  expect(businessCounterparties).toEqual([]);
});
