import { categorize } from '@/features/categorization/categorize';
import { DEFAULT_CATEGORIES, SYSTEM_RULES } from '@/features/categorization/defaultCategories';
import { listRules } from './repositories/categories';
import type { SqlDb } from './sql';

type Migration = string | ((db: SqlDb) => Promise<void>);

// Append-only: each entry upgrades the schema by one version (tracked in PRAGMA user_version).
// SQL for schema changes, a function when data has to move. Functions run inside the migration's transaction,
// so they must not open one of their own. All money columns are integer minor units.
export const MIGRATIONS: Migration[] = [
  `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    is_default INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    external_ref TEXT,
    reverses_ref TEXT,
    type TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    amount_minor INTEGER NOT NULL,
    fee_minor INTEGER NOT NULL DEFAULT 0,
    tax_minor INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    counterparty_name TEXT,
    counterparty_number TEXT,
    balance_after_minor INTEGER,
    occurred_at INTEGER NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    source TEXT NOT NULL CHECK (source IN ('sms', 'manual', 'demo')),
    sms_body TEXT,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at DESC);
  CREATE INDEX idx_transactions_category ON transactions(category_id);

  CREATE TABLE category_rules (
    id TEXT PRIMARY KEY,
    match_type TEXT NOT NULL CHECK (match_type IN ('counterparty', 'keyword', 'type')),
    pattern TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL,
    created_by TEXT NOT NULL CHECK (created_by IN ('user', 'system'))
  );

  -- id is the category id, or 'overall' for the whole-month budget.
  CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0)
  );

  -- Raw body is kept only until the user resolves the item (FR-2.5).
  CREATE TABLE review_queue (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL,
    body TEXT NOT NULL,
    received_at INTEGER NOT NULL
  );

  CREATE TABLE parser_templates (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    version INTEGER NOT NULL,
    type TEXT NOT NULL,
    pattern TEXT NOT NULL,
    date_format TEXT
  );

  CREATE TABLE sync_state (
    table_name TEXT PRIMARY KEY,
    last_synced_at INTEGER,
    pending_changes INTEGER NOT NULL DEFAULT 0
  );
  `,

  // v2: Cash withdrawals and Bank transfers. Existing installs get the categories, and transactions still in Other
  // are re-sorted with the current rules (cash-outs, bank pushes, and anything an improved keyword rule now knows). A fresh install has no categories yet and gets them
  // with the other defaults.
  async (db) => {
    const existing = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
    if (!existing?.n) return;
    for (const [i, c] of DEFAULT_CATEGORIES.filter((d) => d.id === 'cash' || d.id === 'bank').entries()) {
      await db.run('INSERT OR IGNORE INTO categories (id, name, icon, color, kind, is_default, sort) VALUES (?, ?, ?, ?, ?, 1, ?)', [c.id, c.name, c.icon, c.color, c.kind, 10 + i]);
    }
    await db.run("UPDATE categories SET sort = 99 WHERE id = 'other'");

    const rules = [...(await listRules(db)).filter((r) => r.createdBy === 'user'), ...SYSTEM_RULES];
    const rows = await db.all<{ id: string; type: never; counterparty_name: string | null; counterparty_number: string | null }>(
      "SELECT id, type, counterparty_name, counterparty_number FROM transactions WHERE category_id = 'other'",
    );
    for (const r of rows) {
      const next = categorize({ type: r.type, counterpartyName: r.counterparty_name ?? undefined, counterpartyNumber: r.counterparty_number ?? undefined }, rules);
      if (next !== 'other') await db.run('UPDATE transactions SET category_id = ?, updated_at = ? WHERE id = ?', [next, Date.now(), r.id]);
    }
  },
];

// `target` exists for tests that need a database at an older version.
export async function migrate(db: SqlDb, target = MIGRATIONS.length): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let v = from; v < target; v++) {
    await db.transaction(async () => {
      const step = MIGRATIONS[v]!;
      if (typeof step === 'string') await db.exec(step);
      else await step(db);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return target;
}
